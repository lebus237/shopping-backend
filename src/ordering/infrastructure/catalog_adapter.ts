import type { ProductId } from '#shared/domain/ids'
import type { ProductRepository } from '#catalog/domain/product_repository'
import type { OrderableProduct, ProductCatalog } from '#ordering/application/ports'

/**
 * Anti-corruption adapter: translates Catalog's Product into Ordering's
 * `OrderableProduct`. This file is the ONLY place where Ordering touches
 * Catalog, so the coupling between the contexts is visible and small.
 */
export class CatalogAdapter implements ProductCatalog {
  constructor(private readonly products: ProductRepository) {}

  async findOrderable(ids: ProductId[]): Promise<OrderableProduct[]> {
    const products = await this.products.findByIds(ids)
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      priceCents: p.priceCents,
      sellable: p.isSellable(),
    }))
  }
}
