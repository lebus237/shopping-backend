import type { Database } from '@adonisjs/lucid/database'
import type { Page, PageRequest } from '#shared/application/page'
import type { OrderDto, OrderReadModel, OrderSummaryDto } from '#ordering/application/ports'

export class LucidOrderReadModel implements OrderReadModel {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<OrderDto | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null
    const order = await this.db.from('orders').where('id', id).first()
    if (!order) return null
    const lines = await this.db.from('order_lines').where('order_id', id).orderBy('id')

    const mapped = lines.map((l) => ({
      productId: l.product_id as string,
      productName: l.product_name as string,
      unitPriceCents: l.unit_price_cents as number,
      quantity: l.quantity as number,
    }))
    return {
      id: order.id,
      customerId: order.customer_id,
      status: order.status,
      placedAt: new Date(order.placed_at).toISOString(),
      totalCents: mapped.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0),
      lines: mapped,
    }
  }

  async listByCustomer(customerId: string, request: PageRequest): Promise<Page<OrderSummaryDto>> {
    const [{ total }] = await this.db
      .from('orders')
      .where('customer_id', customerId)
      .count('* as total')

    const rows = await this.db
      .from('orders as o')
      .leftJoin('order_lines as l', 'l.order_id', 'o.id')
      .where('o.customer_id', customerId)
      .groupBy('o.id')
      .select('o.id', 'o.status', 'o.placed_at')
      .select(this.db.raw('COALESCE(SUM(l.unit_price_cents * l.quantity), 0)::int AS total_cents'))
      .select(this.db.raw('COUNT(l.id)::int AS line_count'))
      .orderBy('o.placed_at', 'desc')
      .forPage(request.page, request.limit)

    return {
      items: rows.map((r) => ({
        id: r.id,
        status: r.status,
        totalCents: r.total_cents,
        placedAt: new Date(r.placed_at).toISOString(),
        lineCount: r.line_count,
      })),
      total: Number(total),
      page: request.page,
      limit: request.limit,
    }
  }
}
