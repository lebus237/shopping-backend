import { test } from '@japa/runner'
import { Order, type OrderLine } from '#ordering/domain/order'
import { OrderCancelled, OrderPaid, OrderPlaced } from '#ordering/domain/events'
import { newId, type ProductId, type UserId } from '#shared/domain/ids'
import type { Actor } from '#shared/domain/actor'

const owner: Actor = { userId: newId<UserId>(), role: 'customer' }
const stranger: Actor = { userId: newId<UserId>(), role: 'customer' }
const admin: Actor = { userId: newId<UserId>(), role: 'admin' }

const line = (over: Partial<OrderLine> = {}): OrderLine => ({
  productId: newId<ProductId>(),
  productName: 'Mug',
  unitPriceCents: 500,
  quantity: 2,
  ...over,
})

const place = (lines = [line()]) => Order.place({ customerId: owner.userId, lines })

test.group('Order aggregate: placement', () => {
  test('computes total and records OrderPlaced', ({ assert }) => {
    const order = place([
      line({ unitPriceCents: 500, quantity: 2 }),
      line({ unitPriceCents: 100, quantity: 3 }),
    ])
    assert.equal(order.totalCents, 1300)
    assert.equal(order.status, 'PLACED')
    const [event] = order.pullEvents()
    assert.instanceOf(event, OrderPlaced)
  })

  test('requires at least one line', ({ assert }) => {
    assert.throws(() => place([]), /at least one line/)
  })

  test('rejects bad quantities and duplicate products', ({ assert }) => {
    assert.throws(() => place([line({ quantity: 0 })]))
    assert.throws(() => place([line({ quantity: 1.5 })]))
    const productId = newId<ProductId>()
    assert.throws(() => place([line({ productId }), line({ productId })]), /only once/)
  })
})

test.group('Order aggregate: lifecycle', () => {
  test('PLACED -> PAID -> SHIPPED', ({ assert }) => {
    const order = place()
    order.pullEvents()
    order.pay(owner)
    assert.equal(order.status, 'PAID')
    assert.instanceOf(order.pullEvents()[0], OrderPaid)
    order.ship()
    assert.equal(order.status, 'SHIPPED')
  })

  test('cancel is only possible from PLACED and records the items to release', ({ assert }) => {
    const order = place()
    order.pullEvents()
    order.cancel(owner)
    assert.equal(order.status, 'CANCELLED')
    const [event] = order.pullEvents() as OrderCancelled[]
    assert.instanceOf(event, OrderCancelled)
    assert.lengthOf(event.items, 1)

    const paid = place()
    paid.pay(owner)
    assert.throws(() => paid.cancel(owner), /Cannot move an order from PAID/)
  })

  test('illegal transitions are rejected', ({ assert }) => {
    const order = place()
    assert.throws(() => order.ship(), /from PLACED to SHIPPED/)
    order.pay(owner)
    assert.throws(() => order.pay(owner), /from PAID to PAID/)
  })

  test('a stranger cannot act on or read the order, an admin can', ({ assert }) => {
    const order = place()
    assert.throws(() => order.pay(stranger), /Order not found/)
    assert.isFalse(order.canBeReadBy(stranger))
    assert.isTrue(order.canBeReadBy(owner))
    assert.isTrue(order.canBeReadBy(admin))
    order.cancel(admin)
    assert.equal(order.status, 'CANCELLED')
  })
})
