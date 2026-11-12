import type { HttpContext } from '@adonisjs/core/http'
import type { CommandBus, QueryBus } from '#shared/application/bus'
import type { Actor } from '#shared/domain/actor'
import type { UserId } from '#shared/domain/ids'
import type AuthUser from '#identity/infrastructure/auth_user'

/**
 * Controllers are translation only: HTTP in -> message -> bus -> HTTP out.
 * No business rule belongs here. The buses are injected by the provider, so
 * there is no service locator and no container lookup inside controllers.
 */
export abstract class HttpController {
  constructor(
    protected readonly commands: CommandBus,
    protected readonly queries: QueryBus
  ) {}

  /** For routes behind the `auth` middleware. */
  protected actor({ auth }: HttpContext): Actor {
    const user = auth.getUserOrFail() as AuthUser
    return { userId: user.id as UserId, role: user.role }
  }

  /** For public routes that behave differently for signed-in users. */
  protected async optionalActor({ auth }: HttpContext): Promise<Actor | null> {
    if (!(await auth.check())) return null
    const user = auth.user as AuthUser
    return { userId: user.id as UserId, role: user.role }
  }

  protected paging({ request }: HttpContext) {
    const { page, limit } = request.qs()
    return { page: Number(page) || 1, limit: Number(limit) || 20 }
  }
}
