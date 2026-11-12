import type { OrderId } from '#shared/domain/ids'
import type { Order } from '#ordering/domain/order'

export interface OrderRepository {
  save(order: Order): Promise<void>
  findById(id: OrderId): Promise<Order | null>
}
