import type { Database } from '@adonisjs/lucid/database'
import type { Page } from '#shared/application/page'
import type { ProductDto, ProductReadModel } from '#catalog/application/dto'

interface Row {
  id: string
  sku: string
  name: string
  price_cents: number
  stock: number
  active: boolean
}

const toDto = (r: Row): ProductDto => ({
  id: r.id,
  sku: r.sku,
  name: r.name,
  priceCents: r.price_cents,
  stock: r.stock,
  active: r.active,
})

/** Query side: plain SQL straight to DTOs, no aggregates, no events. */
export class LucidProductReadModel implements ProductReadModel {
  constructor(private readonly db: Database) {}

  async list(filter: {
    onlyActive: boolean
    search?: string
    page: number
    limit: number
  }): Promise<Page<ProductDto>> {
    const base = () => {
      const q = this.db.from('products')
      if (filter.onlyActive) q.where('active', true)
      if (filter.search) q.whereILike('name', `%${filter.search}%`)
      return q
    }

    const [{ total }] = await base().count('* as total')
    const rows = (await base()
      .select('id', 'sku', 'name', 'price_cents', 'stock', 'active')
      .orderBy('name')
      .forPage(filter.page, filter.limit)) as Row[]

    return { items: rows.map(toDto), total: Number(total), page: filter.page, limit: filter.limit }
  }

  async findById(id: string, onlyActive: boolean): Promise<ProductDto | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null
    const q = this.db.from('products').where('id', id)
    if (onlyActive) q.where('active', true)
    const row = (await q.first()) as Row | null
    return row ? toDto(row) : null
  }
}
