import { Query } from '#shared/application/message'
import type { Actor } from '#shared/domain/actor'
import type { Page } from '#shared/application/page'
import type { ProductDto } from '#catalog/application/dto'

/** Public: `actor` is null for anonymous visitors. */
export class ListProductsQuery extends Query<Page<ProductDto>> {
  constructor(
    readonly actor: Actor | null,
    readonly search: string | undefined,
    readonly page: number,
    readonly limit: number
  ) {
    super()
  }
}

export class GetProductQuery extends Query<ProductDto> {
  constructor(
    readonly actor: Actor | null,
    readonly productId: string
  ) {
    super()
  }
}
