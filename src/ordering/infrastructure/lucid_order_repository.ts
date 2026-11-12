import type { LucidUnitOfWork } from '#shared/infrastructure/lucid_unit_of_work'
import { ConcurrencyError } from '#shared/domain/errors/app_error'
import type { OrderId, ProductId, UserId } from '#shared/domain/ids'
import { Order, type OrderStatus } from '#ordering/domain/order'
import type { OrderRepository } from '#ordering/domain/order_repository'

interface OrderRow {
  id: string
  customer_id: string
  status: OrderStatus
  placed_at: Date
  version: number
}

interface LineRow {
  product_id: string
  product_name: string
  unit_price_cents: number
  quantity: number
}

export class LucidOrderRepository implements OrderRepository {
  constructor(private readonly uow: LucidUnitOfWork) {}

  async save(order: Order): Promise<void> {
    const s = order.toSnapshot()
    const client = this.uow.client

    if (order.isNew) {
      await client.table('orders').insert({
        id: s.id,
        customer_id: s.customerId,
        status: s.status,
        placed_at: s.placedAt,
        version: 1,
      })
      // Lines are immutable once placed, so they are only ever inserted, never
      // diffed or rewritten (the old delete-all-then-reinsert bug cannot occur).
      await client.table('order_lines').multiInsert(
        s.lines.map((l) => ({
          order_id: s.id,
          product_id: l.productId,
          product_name: l.productName,
          unit_price_cents: l.unitPriceCents,
          quantity: l.quantity,
        }))
      )
    } else {
      const affected = (await client
        .from('orders')
        .where({ id: s.id, version: s.version })
        .update({
          status: s.status,
          version: s.version + 1,
          updated_at: new Date(),
        })) as unknown as number
      if (affected === 0) throw new ConcurrencyError('Order')
    }

    this.uow.collect(order.pullEvents())
  }

  async findById(id: OrderId): Promise<Order | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null
    const client = this.uow.client
    const row = (await client.from('orders').where('id', id).first()) as OrderRow | null
    if (!row) return null
    const lines = (await client
      .from('order_lines')
      .where('order_id', id)
      .orderBy('id')
      .select('*')) as LineRow[]

    return Order.reconstitute({
      id: row.id as OrderId,
      customerId: row.customer_id as UserId,
      status: row.status,
      placedAt: row.placed_at,
      version: row.version,
      lines: lines.map((l) => ({
        productId: l.product_id as ProductId,
        productName: l.product_name,
        unitPriceCents: l.unit_price_cents,
        quantity: l.quantity,
      })),
    })
  }
}
