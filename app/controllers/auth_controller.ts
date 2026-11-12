import type { HttpContext } from '@adonisjs/core/http'
import { HttpController } from '#controllers/http_controller'
import { credentialsSchema } from '#validators/schemas'
import { LoginCommand, RegisterUserCommand } from '#identity/application/commands/user_commands'
import { GetMeQuery } from '#identity/application/queries/user_queries'

export default class AuthController extends HttpController {
  async register({ request, response }: HttpContext) {
    const { email, password } = await request.validateUsing(credentialsSchema)
    const id = await this.commands.dispatch(new RegisterUserCommand(email, password))
    return response.created({ id })
  }

  async login({ request, response }: HttpContext) {
    const { email, password } = await request.validateUsing(credentialsSchema)
    const token = await this.commands.dispatch(new LoginCommand(email, password))
    return response.ok({ token })
  }

  async me(ctx: HttpContext) {
    return ctx.response.ok(await this.queries.dispatch(new GetMeQuery(this.actor(ctx))))
  }
}
