import type { Handler } from '#shared/application/message'
import type { OrderId } from '#shared/domain/ids'
import { Order, type OrderLine } from '#ordering/domain/order'
import type { OrderRepository } from '#ordering/domain/order_repository'
import {
  OrderNotFoundError,
  ProductNotSellableError,
} from '#ordering/domain/errors/ordering_errors'
import type { ProductCatalog } from '#ordering/application/ports'
import type {
  CancelOrderCommand,
  PayOrderCommand,
  PlaceOrderCommand,
  ShipOrderCommand,
} from '#ordering/application/commands/order_commands'

export class PlaceOrderHandler implements Handler<PlaceOrderCommand> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly catalog: ProductCatalog
  ) {}

  async handle(command: PlaceOrderCommand): Promise<OrderId> {
    const found = await this.catalog.findOrderable(command.items.map((i) => i.productId))
    const byId = new Map(found.map((p) => [p.id, p]))

    const lines: OrderLine[] = command.items.map((item) => {
      const product = byId.get(item.productId)
      if (!product || !product.sellable) throw new ProductNotSellableError()
      return {
        productId: product.id,
        productName: product.name,
        unitPriceCents: product.priceCents,
        quantity: item.quantity,
      }
    })

    // Invariants (non-empty, positive quantities, no duplicates) live in Order.
    // Stock is reserved by Catalog's OrderPlaced handler inside this transaction.
    const order = Order.place({ customerId: command.actor.userId, lines })
    await this.orders.save(order)
    return order.id
  }
}

abstract class OrderTransitionHandler {
  constructor(protected readonly orders: OrderRepository) {}

  protected async load(id: OrderId): Promise<Order> {
    const order = await this.orders.findById(id)
    if (!order) throw new OrderNotFoundError()
    return order
  }
}

export class PayOrderHandler extends OrderTransitionHandler implements Handler<PayOrderCommand> {
  async handle(command: PayOrderCommand): Promise<void> {
    const order = await this.load(command.orderId)
    order.pay(command.actor)
    await this.orders.save(order)
  }
}

export class CancelOrderHandler
  extends OrderTransitionHandler
  implements Handler<CancelOrderCommand>
{
  async handle(command: CancelOrderCommand): Promise<void> {
    const order = await this.load(command.orderId)
    order.cancel(command.actor)
    await this.orders.save(order)
  }
}

export class ShipOrderHandler extends OrderTransitionHandler implements Handler<ShipOrderCommand> {
  async handle(command: ShipOrderCommand): Promise<void> {
    const order = await this.load(command.orderId)
    order.ship()
    await this.orders.save(order)
  }
}
