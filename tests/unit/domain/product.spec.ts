import { test } from '@japa/runner'
import { Product } from '#catalog/domain/product'
import { ProductCreated, StockChanged } from '#catalog/domain/events'

const make = (stock = 5) =>
  Product.create({ sku: ' abc-1 ', name: ' Mug ', priceCents: 1500, stock })

test.group('Product aggregate', () => {
  test('create normalizes input, starts new and records ProductCreated', ({ assert }) => {
    const p = make()
    assert.equal(p.sku, 'ABC-1')
    assert.equal(p.name, 'Mug')
    assert.isTrue(p.isNew)
    const events = p.pullEvents()
    assert.lengthOf(events, 1)
    assert.instanceOf(events[0], ProductCreated)
    assert.lengthOf(p.pullEvents(), 0, 'events are drained once')
  })

  test('rejects invalid input', ({ assert }) => {
    assert.throws(() => Product.create({ sku: '', name: 'x', priceCents: 1, stock: 0 }))
    assert.throws(() => Product.create({ sku: 'a', name: 'x', priceCents: 0, stock: 0 }))
    assert.throws(() => Product.create({ sku: 'a', name: 'x', priceCents: 1.5, stock: 0 }))
    assert.throws(() => Product.create({ sku: 'a', name: 'x', priceCents: 1, stock: -1 }))
  })

  test('reserve decrements stock and records StockChanged', ({ assert }) => {
    const p = make(5)
    p.pullEvents()
    p.reserve(3)
    assert.equal(p.stock, 2)
    const [event] = p.pullEvents()
    assert.instanceOf(event, StockChanged)
    assert.deepEqual(event.payload(), { delta: -3, stockAfter: 2 })
  })

  test('stock can never go negative', ({ assert }) => {
    const p = make(2)
    assert.throws(() => p.reserve(3), /Not enough stock/)
    assert.equal(p.stock, 2, 'failed reserve leaves state untouched')
  })

  test('restock and reserve reject non-positive or fractional quantities', ({ assert }) => {
    const p = make()
    assert.throws(() => p.restock(0))
    assert.throws(() => p.reserve(-1))
    assert.throws(() => p.reserve(1.5))
  })

  test('deactivated product is not sellable', ({ assert }) => {
    const p = make()
    p.deactivate()
    assert.isFalse(p.isSellable())
    p.activate()
    assert.isTrue(p.isSellable())
  })

  test('reconstitute is silent and keeps the stored version', ({ assert }) => {
    const p = Product.reconstitute({ ...make().toSnapshot(), version: 7 })
    assert.isFalse(p.isNew)
    assert.equal(p.version, 7)
    assert.lengthOf(p.pullEvents(), 0)
  })
})
