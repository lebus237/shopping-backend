import type { EventDispatcher } from '#shared/application/event_dispatcher'
import type { ProductRepository } from '#catalog/domain/product_repository'
import { ProductNotFoundError } from '#catalog/domain/errors/catalog_errors'
// Events are the published language between contexts: Catalog may depend on
// the event classes of Ordering, but never on its aggregates or repositories.
import { OrderCancelled, OrderPlaced, type OrderedItem } from '#ordering/domain/events'

/**
 * Catalog reacts to what happened in Ordering. Both handlers run in the SAME
 * transaction as the command that raised the event, so "order placed" and
 * "stock reserved" commit or roll back together. If stock is insufficient the
 * handler throws and the order is never stored.
 */
export function registerStockEventHandlers(
  dispatcher: EventDispatcher,
  products: ProductRepository
): void {
  async function apply(items: OrderedItem[], change: 'reserve' | 'release') {
    for (const item of items) {
      const product = await products.findById(item.productId)
      if (!product) throw new ProductNotFoundError()
      if (change === 'reserve') product.reserve(item.quantity)
      else product.restock(item.quantity)
      await products.save(product)
    }
  }

  dispatcher.on(OrderPlaced, 'in_transaction', (event) => apply(event.items, 'reserve'))
  dispatcher.on(OrderCancelled, 'in_transaction', (event) => apply(event.items, 'release'))
}
