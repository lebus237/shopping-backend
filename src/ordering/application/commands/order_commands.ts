import { Command } from '#shared/application/message'
import type { Actor, Role } from '#shared/domain/actor'
import type { OrderId, ProductId } from '#shared/domain/ids'

const ANY_USER: readonly Role[] = ['customer', 'admin']
const ADMIN: readonly Role[] = ['admin']

export interface RequestedItem {
  productId: ProductId
  quantity: number
}

export class PlaceOrderCommand extends Command<OrderId> {
  static override readonly roles = ANY_USER
  constructor(
    readonly actor: Actor,
    readonly items: RequestedItem[]
  ) {
    super()
  }
}

export class PayOrderCommand extends Command {
  static override readonly roles = ANY_USER
  constructor(
    readonly actor: Actor,
    readonly orderId: OrderId
  ) {
    super()
  }
}

export class CancelOrderCommand extends Command {
  static override readonly roles = ANY_USER
  constructor(
    readonly actor: Actor,
    readonly orderId: OrderId
  ) {
    super()
  }
}

export class ShipOrderCommand extends Command {
  static override readonly roles = ADMIN
  constructor(
    readonly actor: Actor,
    readonly orderId: OrderId
  ) {
    super()
  }
}
