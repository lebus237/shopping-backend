import type { ProductId } from '#shared/domain/ids'
import type { Product } from '#catalog/domain/product'

/** Port owned by the domain; implemented in infrastructure. */
export interface ProductRepository {
  /** Inserts (version 0) or updates with an optimistic-lock check. */
  save(product: Product): Promise<void>
  findById(id: ProductId): Promise<Product | null>
  findByIds(ids: ProductId[]): Promise<Product[]>
  existsBySku(sku: string): Promise<boolean>
}
