import type { HttpContext } from '@adonisjs/core/http'
import { HttpController } from '#controllers/http_controller'
import { parseId, type OrderId, type ProductId } from '#shared/domain/ids'
import { placeOrderSchema } from '#validators/schemas'
import {
  CancelOrderCommand,
  PayOrderCommand,
  PlaceOrderCommand,
  ShipOrderCommand,
} from '#ordering/application/commands/order_commands'
import { GetOrderQuery, ListMyOrdersQuery } from '#ordering/application/queries/order_queries'

export default class OrderController extends HttpController {
  async store(ctx: HttpContext) {
    const { items } = await ctx.request.validateUsing(placeOrderSchema)
    const id = await this.commands.dispatch(
      new PlaceOrderCommand(
        this.actor(ctx),
        items.map((i) => ({ productId: i.productId as ProductId, quantity: i.quantity }))
      )
    )
    return ctx.response.created({ id })
  }

  async index(ctx: HttpContext) {
    const { page, limit } = this.paging(ctx)
    return ctx.response.ok(
      await this.queries.dispatch(new ListMyOrdersQuery(this.actor(ctx), page, limit))
    )
  }

  async show(ctx: HttpContext) {
    return ctx.response.ok(
      await this.queries.dispatch(new GetOrderQuery(this.actor(ctx), ctx.request.param('id')))
    )
  }

  async pay(ctx: HttpContext) {
    await this.commands.dispatch(
      new PayOrderCommand(this.actor(ctx), parseId<OrderId>(ctx.request.param('id')))
    )
    return ctx.response.noContent()
  }

  async cancel(ctx: HttpContext) {
    await this.commands.dispatch(
      new CancelOrderCommand(this.actor(ctx), parseId<OrderId>(ctx.request.param('id')))
    )
    return ctx.response.noContent()
  }

  async ship(ctx: HttpContext) {
    await this.commands.dispatch(
      new ShipOrderCommand(this.actor(ctx), parseId<OrderId>(ctx.request.param('id')))
    )
    return ctx.response.noContent()
  }
}
