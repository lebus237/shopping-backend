import { AggregateRoot } from '#shared/domain/aggregate_root'
import type { Actor } from '#shared/domain/actor'
import { newId, type OrderId, type ProductId, type UserId } from '#shared/domain/ids'
import { OrderCancelled, OrderPaid, OrderPlaced, OrderShipped } from '#ordering/domain/events'
import {
  InvalidOrderError,
  InvalidOrderTransitionError,
  OrderNotFoundError,
} from '#ordering/domain/errors/ordering_errors'

export type OrderStatus = 'PLACED' | 'PAID' | 'SHIPPED' | 'CANCELLED'

export interface OrderLine {
  readonly productId: ProductId
  /** Name and price are SNAPSHOTS taken at purchase time. */
  readonly productName: string
  readonly unitPriceCents: number
  readonly quantity: number
}

export interface OrderSnapshot {
  id: OrderId
  customerId: UserId
  status: OrderStatus
  lines: OrderLine[]
  placedAt: Date
  version: number
}

/**
 * Aggregate root for an order and its lines (lines are not an aggregate on
 * their own: nothing outside refers to them, and they cannot change after
 * placement). Lifecycle:
 *
 *   PLACED --pay--> PAID --ship--> SHIPPED
 *      \--cancel--> CANCELLED
 */
export class Order extends AggregateRoot {
  private constructor(
    readonly id: OrderId,
    readonly customerId: UserId,
    private _status: OrderStatus,
    readonly lines: readonly OrderLine[],
    readonly placedAt: Date,
    version: number
  ) {
    super(version)
  }

  static place(input: { customerId: UserId; lines: OrderLine[]; placedAt?: Date }): Order {
    const { lines } = input
    if (lines.length === 0) throw new InvalidOrderError('An order needs at least one line')

    const seen = new Set<string>()
    for (const line of lines) {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new InvalidOrderError('Line quantity must be a positive integer')
      }
      if (!Number.isInteger(line.unitPriceCents) || line.unitPriceCents < 0) {
        throw new InvalidOrderError('Line price must be a non-negative integer')
      }
      if (seen.has(line.productId)) {
        throw new InvalidOrderError('A product can appear only once per order')
      }
      seen.add(line.productId)
    }

    const order = new Order(
      newId<OrderId>(),
      input.customerId,
      'PLACED',
      [...lines],
      input.placedAt ?? new Date(),
      0
    )
    order.record(
      new OrderPlaced(
        order.id,
        order.customerId,
        order.totalCents,
        order.lines.map((l) => ({ productId: l.productId, quantity: l.quantity }))
      )
    )
    return order
  }

  static reconstitute(s: OrderSnapshot): Order {
    return new Order(s.id, s.customerId, s.status, s.lines, s.placedAt, s.version)
  }

  get status(): OrderStatus {
    return this._status
  }

  get totalCents(): number {
    return this.lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0)
  }

  /**
   * The owner and administrators may act on an order. For anyone else the
   * order simply "does not exist", so ids cannot be probed.
   */
  private assertAccessibleBy(actor: Actor): void {
    if (actor.role !== 'admin' && actor.userId !== this.customerId) {
      throw new OrderNotFoundError()
    }
  }

  canBeReadBy(actor: Actor): boolean {
    return actor.role === 'admin' || actor.userId === this.customerId
  }

  pay(actor: Actor): void {
    this.assertAccessibleBy(actor)
    this.transition('PLACED', 'PAID')
    this.record(new OrderPaid(this.id))
  }

  cancel(actor: Actor): void {
    this.assertAccessibleBy(actor)
    this.transition('PLACED', 'CANCELLED')
    this.record(
      new OrderCancelled(
        this.id,
        this.lines.map((l) => ({ productId: l.productId, quantity: l.quantity }))
      )
    )
  }

  ship(): void {
    this.transition('PAID', 'SHIPPED')
    this.record(new OrderShipped(this.id))
  }

  private transition(expected: OrderStatus, next: OrderStatus): void {
    if (this._status !== expected) throw new InvalidOrderTransitionError(this._status, next)
    this._status = next
  }

  toSnapshot(): OrderSnapshot {
    return {
      id: this.id,
      customerId: this.customerId,
      status: this._status,
      lines: [...this.lines],
      placedAt: this.placedAt,
      version: this.version,
    }
  }
}
