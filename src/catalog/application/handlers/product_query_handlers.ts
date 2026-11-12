import type { Handler } from '#shared/application/message'
import type { Page } from '#shared/application/page'
import { normalizePage } from '#shared/application/page'
import { isAdmin } from '#shared/domain/actor'
import { ProductNotFoundError } from '#catalog/domain/errors/catalog_errors'
import type { ProductDto, ProductReadModel } from '#catalog/application/dto'
import type {
  GetProductQuery,
  ListProductsQuery,
} from '#catalog/application/queries/product_queries'

/**
 * The visibility rule ("only admins see inactive products") is decided here,
 * in the application layer, and passed to the read model as a plain flag.
 * It is NOT a client-controlled filter, so it cannot be bypassed from the URL.
 */
export class ListProductsHandler implements Handler<ListProductsQuery> {
  constructor(private readonly readModel: ProductReadModel) {}

  async handle(query: ListProductsQuery): Promise<Page<ProductDto>> {
    const { page, limit } = normalizePage(query.page, query.limit)
    return this.readModel.list({
      onlyActive: !isAdmin(query.actor),
      search: query.search,
      page,
      limit,
    })
  }
}

export class GetProductHandler implements Handler<GetProductQuery> {
  constructor(private readonly readModel: ProductReadModel) {}

  async handle(query: GetProductQuery): Promise<ProductDto> {
    const dto = await this.readModel.findById(query.productId, !isAdmin(query.actor))
    if (!dto) throw new ProductNotFoundError()
    return dto
  }
}
