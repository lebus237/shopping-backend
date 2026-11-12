import { DomainEvent } from '#shared/domain/domain_event'
import type { OrderId, ProductId, UserId } from '#shared/domain/ids'

export interface OrderedItem {
  productId: ProductId
  quantity: number
}

export class OrderPlaced extends DomainEvent {
  constructor(
    readonly aggregateId: OrderId,
    readonly customerId: UserId,
    readonly totalCents: number,
    readonly items: OrderedItem[]
  ) {
    super()
  }
  payload() {
    return { customerId: this.customerId, totalCents: this.totalCents, items: this.items }
  }
}

export class OrderPaid extends DomainEvent {
  constructor(readonly aggregateId: OrderId) {
    super()
  }
  payload() {
    return {}
  }
}

export class OrderCancelled extends DomainEvent {
  constructor(
    readonly aggregateId: OrderId,
    readonly items: OrderedItem[]
  ) {
    super()
  }
  payload() {
    return { items: this.items }
  }
}

export class OrderShipped extends DomainEvent {
  constructor(readonly aggregateId: OrderId) {
    super()
  }
  payload() {
    return {}
  }
}
