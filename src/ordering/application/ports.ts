import type { Page, PageRequest } from '#shared/application/page'
import type { ProductId } from '#shared/domain/ids'

/**
 * Anti-corruption port: what Ordering needs to know about a product, in
 * Ordering's own words. Ordering never imports Catalog's Product aggregate.
 */
export interface OrderableProduct {
  id: ProductId
  name: string
  priceCents: number
  sellable: boolean
}

export interface ProductCatalog {
  findOrderable(ids: ProductId[]): Promise<OrderableProduct[]>
}

export interface OrderLineDto {
  productId: string
  productName: string
  unitPriceCents: number
  quantity: number
}

export interface OrderDto {
  id: string
  customerId: string
  status: string
  totalCents: number
  placedAt: string
  lines: OrderLineDto[]
}

export interface OrderSummaryDto {
  id: string
  status: string
  totalCents: number
  placedAt: string
  lineCount: number
}

export interface OrderReadModel {
  findById(id: string): Promise<OrderDto | null>
  listByCustomer(customerId: string, request: PageRequest): Promise<Page<OrderSummaryDto>>
}
