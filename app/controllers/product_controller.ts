import type { HttpContext } from '@adonisjs/core/http'
import { HttpController } from '#controllers/http_controller'
import { parseId, type ProductId } from '#shared/domain/ids'
import { createProductSchema, restockSchema, setActiveSchema } from '#validators/schemas'
import {
  CreateProductCommand,
  RestockProductCommand,
  SetProductActiveCommand,
} from '#catalog/application/commands/product_commands'
import { GetProductQuery, ListProductsQuery } from '#catalog/application/queries/product_queries'

export default class ProductController extends HttpController {
  async index(ctx: HttpContext) {
    const { page, limit } = this.paging(ctx)
    const search = ctx.request.qs().q as string | undefined
    const actor = await this.optionalActor(ctx)
    return ctx.response.ok(
      await this.queries.dispatch(new ListProductsQuery(actor, search, page, limit))
    )
  }

  async show(ctx: HttpContext) {
    const actor = await this.optionalActor(ctx)
    return ctx.response.ok(
      await this.queries.dispatch(new GetProductQuery(actor, ctx.request.param('id')))
    )
  }

  async store(ctx: HttpContext) {
    const p = await ctx.request.validateUsing(createProductSchema)
    const id = await this.commands.dispatch(
      new CreateProductCommand(this.actor(ctx), p.sku, p.name, p.priceCents, p.stock)
    )
    return ctx.response.created({ id })
  }

  async restock(ctx: HttpContext) {
    const { quantity } = await ctx.request.validateUsing(restockSchema)
    await this.commands.dispatch(
      new RestockProductCommand(
        this.actor(ctx),
        parseId<ProductId>(ctx.request.param('id')),
        quantity
      )
    )
    return ctx.response.noContent()
  }

  async setActive(ctx: HttpContext) {
    const { active } = await ctx.request.validateUsing(setActiveSchema)
    await this.commands.dispatch(
      new SetProductActiveCommand(
        this.actor(ctx),
        parseId<ProductId>(ctx.request.param('id')),
        active
      )
    )
    return ctx.response.noContent()
  }
}
