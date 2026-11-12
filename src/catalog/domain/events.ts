import { DomainEvent } from '#shared/domain/domain_event'
import type { ProductId } from '#shared/domain/ids'

export class ProductCreated extends DomainEvent {
  constructor(
    readonly aggregateId: ProductId,
    readonly sku: string,
    readonly initialStock: number
  ) {
    super()
  }
  payload() {
    return { sku: this.sku, initialStock: this.initialStock }
  }
}

export class StockChanged extends DomainEvent {
  constructor(
    readonly aggregateId: ProductId,
    readonly delta: number,
    readonly stockAfter: number
  ) {
    super()
  }
  payload() {
    return { delta: this.delta, stockAfter: this.stockAfter }
  }
}
