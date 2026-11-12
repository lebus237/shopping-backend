import { test } from '@japa/runner'
import { createProduct, resetDatabase, signUp } from '../support/helpers.js'

test.group('Catalog', (group) => {
  group.each.setup(resetDatabase)

  test('only admins can manage products (policy lives on the command)', async ({ client }) => {
    const customer = await signUp(client)
    const body = { sku: 'X-1', name: 'Mug', priceCents: 1000, stock: 5 }

    ;(await client.post('/api/admin/products').json(body)).assertStatus(401)
    ;(await client.post('/api/admin/products').bearerToken(customer.token).json(body)).assertStatus(
      403
    )

    const admin = await signUp(client, { admin: true })
    ;(await client.post('/api/admin/products').bearerToken(admin.token).json(body)).assertStatus(
      201
    )
  })

  test('duplicate sku -> 409; invalid payload -> 422', async ({ client }) => {
    const admin = await signUp(client, { admin: true })
    await createProduct(client, admin.token, { sku: 'DUP' })
    const dup = await client
      .post('/api/admin/products')
      .bearerToken(admin.token)
      .json({ sku: 'dup', name: 'Again', priceCents: 100, stock: 1 })
    dup.assertStatus(409)

    const bad = await client
      .post('/api/admin/products')
      .bearerToken(admin.token)
      .json({ sku: 'N', name: 'Neg', priceCents: -5, stock: 1 })
    bad.assertStatus(422)
  })

  test('inactive products are hidden from the public but visible to admins', async ({
    client,
    assert,
  }) => {
    const admin = await signUp(client, { admin: true })
    const visible = await createProduct(client, admin.token, { name: 'Visible' })
    const hidden = await createProduct(client, admin.token, { name: 'Hidden' })
    ;(
      await client
        .patch(`/api/admin/products/${hidden}/active`)
        .bearerToken(admin.token)
        .json({ active: false })
    ).assertStatus(204)

    const pub = await client.get('/api/products')
    assert.deepEqual(
      pub.body().items.map((p: { id: string }) => p.id),
      [visible]
    )
    ;(await client.get(`/api/products/${hidden}`)).assertStatus(404)

    // the old bug: a client-controlled ?active=false must not widen visibility
    const sneaky = await client.get('/api/products?active=false&status=inactive')
    assert.equal(sneaky.body().total, 1)

    const asAdmin = await client.get('/api/products').bearerToken(admin.token)
    assert.equal(asAdmin.body().total, 2)
    ;(await client.get(`/api/products/${hidden}`).bearerToken(admin.token)).assertStatus(200)
  })

  test('restock adds stock and search filters by name', async ({ client, assert }) => {
    const admin = await signUp(client, { admin: true })
    const id = await createProduct(client, admin.token, { name: 'Blue Mug', stock: 1 })
    await createProduct(client, admin.token, { name: 'Red Plate' })
    ;(
      await client
        .post(`/api/admin/products/${id}/restock`)
        .bearerToken(admin.token)
        .json({ quantity: 4 })
    ).assertStatus(204)

    const found = await client.get('/api/products?q=mug')
    assert.equal(found.body().total, 1)
    assert.equal(found.body().items[0].stock, 5)
  })
})
