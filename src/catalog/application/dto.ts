import type { Page, PageRequest } from '#shared/application/page'

export interface ProductDto {
  id: string
  sku: string
  name: string
  priceCents: number
  stock: number
  active: boolean
}

/** Read-side port: shaped for the screens, free to bypass the aggregates. */
export interface ProductReadModel {
  list(filter: { onlyActive: boolean; search?: string } & PageRequest): Promise<Page<ProductDto>>
  findById(id: string, onlyActive: boolean): Promise<ProductDto | null>
}
