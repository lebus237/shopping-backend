import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { createProduct, resetDatabase, signUp, stockOf } from '../support/helpers.js'

async function setup(client: Parameters<typeof signUp>[0]) {
  const admin = await signUp(client, { admin: true })
  const alice = await signUp(client)
  const bob = await signUp(client)
  return { admin, alice, bob }
}

const place = (client: Parameters<typeof signUp>[0], token: string, items: object[]) =>
  client.post('/api/orders').bearerToken(token).json({ items })

test.group('Ordering: placing', (group) => {
  group.each.setup(resetDatabase)

  test('places an order, snapshots prices and reserves stock atomically', async ({
    client,
    assert,
  }) => {
    const { admin, alice } = await setup(client)
    const mug = await createProduct(client, admin.token, {
      priceCents: 1500,
      stock: 10,
      name: 'Mug',
    })

    const res = await place(client, alice.token, [{ productId: mug, quantity: 3 }])
    res.assertStatus(201)
    assert.equal(await stockOf(mug), 7)

    // price changes later must not alter the placed order
    await db.from('products').where('id', mug).update({ price_cents: 9999, name: 'Renamed' })

    const order = await client.get(`/api/orders/${res.body().id}`).bearerToken(alice.token)
    order.assertStatus(200)
    assert.equal(order.body().totalCents, 4500)
    assert.equal(order.body().status, 'PLACED')
    assert.equal(order.body().lines[0].productName, 'Mug')
  })

  test('insufficient stock rolls the WHOLE order back (transaction)', async ({
    client,
    assert,
  }) => {
    const { admin, alice } = await setup(client)
    const plenty = await createProduct(client, admin.token, { stock: 10 })
    const scarce = await createProduct(client, admin.token, { stock: 1 })

    const res = await place(client, alice.token, [
      { productId: plenty, quantity: 2 },
      { productId: scarce, quantity: 5 },
    ])
    res.assertStatus(409)
    assert.equal(res.body().error.code, 'INSUFFICIENT_STOCK')

    assert.equal(await stockOf(plenty), 10, 'first line must not stay reserved')
    assert.equal(await stockOf(scarce), 1)
    const count = await db.from('orders').count('* as n').first()
    assert.equal(Number(count.n), 0, 'no order row left behind')
    const audit = await db
      .from('audit_log')
      .where('event_type', 'OrderPlaced')
      .count('* as n')
      .first()
    assert.equal(Number(audit.n), 0, 'no audit row left behind')
  })

  test('validation: empty, duplicate lines, unknown / inactive product', async ({ client }) => {
    const { admin, alice } = await setup(client)
    const p = await createProduct(client, admin.token)
    ;(await place(client, alice.token, [])).assertStatus(422)
    ;(
      await place(client, alice.token, [
        { productId: p, quantity: 1 },
        { productId: p, quantity: 1 },
      ])
    ).assertStatus(422)
    ;(await place(client, alice.token, [{ productId: p, quantity: 0 }])).assertStatus(422)
    ;(
      await place(client, alice.token, [
        { productId: '5d1f6a63-9e50-4a7b-8a39-0d9d3f2a1111', quantity: 1 },
      ])
    ).assertStatus(409)

    await client
      .patch(`/api/admin/products/${p}/active`)
      .bearerToken(admin.token)
      .json({ active: false })
    ;(await place(client, alice.token, [{ productId: p, quantity: 1 }])).assertStatus(409)
  })

  test('requires authentication', async ({ client }) => {
    ;(await client.post('/api/orders').json({ items: [] })).assertStatus(401)
  })
})

test.group('Ordering: lifecycle and ownership', (group) => {
  group.each.setup(resetDatabase)

  test('pay -> ship, with the ship step admin-only', async ({ client, assert }) => {
    const { admin, alice } = await setup(client)
    const p = await createProduct(client, admin.token)
    const id = (await place(client, alice.token, [{ productId: p, quantity: 1 }])).body().id

    ;(await client.post(`/api/admin/orders/${id}/ship`).bearerToken(alice.token)).assertStatus(403)
    ;(await client.post(`/api/admin/orders/${id}/ship`).bearerToken(admin.token)).assertStatus(409) // not paid yet
    ;(await client.post(`/api/orders/${id}/pay`).bearerToken(alice.token)).assertStatus(204)
    ;(await client.post(`/api/orders/${id}/pay`).bearerToken(alice.token)).assertStatus(409) // already paid
    ;(await client.post(`/api/admin/orders/${id}/ship`).bearerToken(admin.token)).assertStatus(204)

    const order = await client.get(`/api/orders/${id}`).bearerToken(alice.token)
    assert.equal(order.body().status, 'SHIPPED')
  })

  test('cancel releases the reserved stock', async ({ client, assert }) => {
    const { admin, alice } = await setup(client)
    const p = await createProduct(client, admin.token, { stock: 5 })
    const id = (await place(client, alice.token, [{ productId: p, quantity: 4 }])).body().id
    assert.equal(await stockOf(p), 1)

    ;(await client.post(`/api/orders/${id}/cancel`).bearerToken(alice.token)).assertStatus(204)
    assert.equal(await stockOf(p), 5)
    ;(await client.post(`/api/orders/${id}/cancel`).bearerToken(alice.token)).assertStatus(409)
    assert.equal(await stockOf(p), 5, 'double cancel must not release twice')
  })

  test("a customer cannot see or touch someone else's order (404, not 403)", async ({
    client,
    assert,
  }) => {
    const { admin, alice, bob } = await setup(client)
    const p = await createProduct(client, admin.token)
    const id = (await place(client, alice.token, [{ productId: p, quantity: 1 }])).body().id

    ;(await client.get(`/api/orders/${id}`).bearerToken(bob.token)).assertStatus(404)
    ;(await client.post(`/api/orders/${id}/pay`).bearerToken(bob.token)).assertStatus(404)
    ;(await client.post(`/api/orders/${id}/cancel`).bearerToken(bob.token)).assertStatus(404)
    ;(await client.get(`/api/orders/${id}`).bearerToken(admin.token)).assertStatus(200)

    const mine = await client.get('/api/orders').bearerToken(bob.token)
    assert.equal(mine.body().total, 0)
    const hers = await client.get('/api/orders').bearerToken(alice.token)
    assert.equal(hers.body().total, 1)
    assert.equal(hers.body().items[0].lineCount, 1)
  })

  test('malformed ids are rejected, not crashed on', async ({ client }) => {
    const { alice } = await setup(client)
    ;(await client.get('/api/orders/not-a-uuid').bearerToken(alice.token)).assertStatus(404)
    ;(await client.post('/api/orders/not-a-uuid/pay').bearerToken(alice.token)).assertStatus(422)
  })
})

test.group('Concurrency and events', (group) => {
  group.each.setup(resetDatabase)

  test('concurrent pay and cancel: exactly one wins', async ({ client, assert }) => {
    const { admin, alice } = await setup(client)
    const p = await createProduct(client, admin.token, { stock: 3 })
    const id = (await place(client, alice.token, [{ productId: p, quantity: 1 }])).body().id

    const [pay, cancel] = await Promise.all([
      client.post(`/api/orders/${id}/pay`).bearerToken(alice.token),
      client.post(`/api/orders/${id}/cancel`).bearerToken(alice.token),
    ])
    const statuses = [pay.status(), cancel.status()].sort()
    assert.deepEqual(statuses, [204, 409])

    // the stock is consistent with whichever won
    const order = await client.get(`/api/orders/${id}`).bearerToken(alice.token)
    assert.equal(await stockOf(p), order.body().status === 'CANCELLED' ? 3 : 2)
  })

  test('concurrent orders can never oversell the last unit', async ({ client, assert }) => {
    const { admin, alice, bob } = await setup(client)
    const p = await createProduct(client, admin.token, { stock: 1 })

    const results = await Promise.all([
      place(client, alice.token, [{ productId: p, quantity: 1 }]),
      place(client, bob.token, [{ productId: p, quantity: 1 }]),
    ])
    const statuses = results.map((r) => r.status()).sort()
    assert.deepEqual(statuses, [201, 409])
    assert.equal(await stockOf(p), 0)
    const orders = await db.from('orders').count('* as n').first()
    assert.equal(Number(orders.n), 1)
  })

  test('domain events are recorded in the audit log in the same transaction', async ({
    client,
    assert,
  }) => {
    const { admin, alice } = await setup(client)
    const p = await createProduct(client, admin.token, { stock: 5 })
    const id = (await place(client, alice.token, [{ productId: p, quantity: 2 }])).body().id
    await client.post(`/api/orders/${id}/pay`).bearerToken(alice.token)

    const types = (await db.from('audit_log').orderBy('occurred_at').select('event_type')).map(
      (r) => r.event_type
    )
    assert.includeMembers(types, [
      'UserRegistered',
      'ProductCreated',
      'OrderPlaced',
      'StockChanged', // raised by Catalog's handler reacting to OrderPlaced
      'OrderPaid',
    ])
    const placed = await db.from('audit_log').where('event_type', 'OrderPlaced').firstOrFail()
    assert.equal(placed.aggregate_id, id)
    assert.equal(placed.payload.items[0].quantity, 2)
  })
})
