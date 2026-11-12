import type { LucidUnitOfWork } from '#shared/infrastructure/lucid_unit_of_work'
import { ConcurrencyError } from '#shared/domain/errors/app_error'
import type { ProductId } from '#shared/domain/ids'
import { Product } from '#catalog/domain/product'
import type { ProductRepository } from '#catalog/domain/product_repository'

interface ProductRow {
  id: string
  sku: string
  name: string
  price_cents: number
  stock: number
  active: boolean
  version: number
}

export class LucidProductRepository implements ProductRepository {
  constructor(private readonly uow: LucidUnitOfWork) {}

  async save(product: Product): Promise<void> {
    const s = product.toSnapshot()
    const client = this.uow.client

    if (product.isNew) {
      await client.table('products').insert({
        id: s.id,
        sku: s.sku,
        name: s.name,
        price_cents: s.priceCents,
        stock: s.stock,
        active: s.active,
        version: 1,
      })
    } else {
      // Optimistic lock: only succeeds if nobody changed the row since we loaded it.
      const affected = (await client
        .from('products')
        .where({ id: s.id, version: s.version })
        .update({
          name: s.name,
          price_cents: s.priceCents,
          stock: s.stock,
          active: s.active,
          version: s.version + 1,
          updated_at: new Date(),
        })) as unknown as number
      if (affected === 0) throw new ConcurrencyError('Product')
    }

    this.uow.collect(product.pullEvents())
  }

  async findById(id: ProductId): Promise<Product | null> {
    const row = (await this.uow.client
      .from('products')
      .where('id', id)
      .first()) as ProductRow | null
    return row ? toDomain(row) : null
  }

  async findByIds(ids: ProductId[]): Promise<Product[]> {
    if (ids.length === 0) return []
    const rows = (await this.uow.client
      .from('products')
      .whereIn('id', ids)
      .select('*')) as ProductRow[]
    return rows.map(toDomain)
  }

  async existsBySku(sku: string): Promise<boolean> {
    const row = (await this.uow.client
      .from('products')
      .where('sku', sku)
      .first()) as ProductRow | null
    return row !== null && row !== undefined
  }
}

function toDomain(row: ProductRow): Product {
  return Product.reconstitute({
    id: row.id as ProductId,
    sku: row.sku,
    name: row.name,
    priceCents: row.price_cents,
    stock: row.stock,
    active: row.active,
    version: row.version,
  })
}
