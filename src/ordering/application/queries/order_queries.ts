import { Query } from '#shared/application/message'
import type { Actor, Role } from '#shared/domain/actor'
import type { Page } from '#shared/application/page'
import type { OrderDto, OrderSummaryDto } from '#ordering/application/ports'

const ANY_USER: readonly Role[] = ['customer', 'admin']

export class GetOrderQuery extends Query<OrderDto> {
  static override readonly roles = ANY_USER
  constructor(
    readonly actor: Actor,
    readonly orderId: string
  ) {
    super()
  }
}

export class ListMyOrdersQuery extends Query<Page<OrderSummaryDto>> {
  static override readonly roles = ANY_USER
  constructor(
    readonly actor: Actor,
    readonly page: number,
    readonly limit: number
  ) {
    super()
  }
}
