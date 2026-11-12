import type { Handler } from '#shared/application/message'
import { normalizePage, type Page } from '#shared/application/page'
import { OrderNotFoundError } from '#ordering/domain/errors/ordering_errors'
import type { OrderDto, OrderReadModel, OrderSummaryDto } from '#ordering/application/ports'
import type { GetOrderQuery, ListMyOrdersQuery } from '#ordering/application/queries/order_queries'

export class GetOrderHandler implements Handler<GetOrderQuery> {
  constructor(private readonly readModel: OrderReadModel) {}

  async handle(query: GetOrderQuery): Promise<OrderDto> {
    const dto = await this.readModel.findById(query.orderId)
    const allowed = dto && (query.actor.role === 'admin' || dto.customerId === query.actor.userId)
    // Same answer for "missing" and "not yours": no existence oracle.
    if (!dto || !allowed) throw new OrderNotFoundError()
    return dto
  }
}

export class ListMyOrdersHandler implements Handler<ListMyOrdersQuery> {
  constructor(private readonly readModel: OrderReadModel) {}

  async handle(query: ListMyOrdersQuery): Promise<Page<OrderSummaryDto>> {
    return this.readModel.listByCustomer(query.actor.userId, normalizePage(query.page, query.limit))
  }
}
