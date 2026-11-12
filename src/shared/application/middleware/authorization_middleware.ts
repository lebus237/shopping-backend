import type { Middleware } from '#shared/application/bus'
import type { Message } from '#shared/application/message'
import { ForbiddenError, UnauthorizedError } from '#shared/domain/errors/app_error'

/**
 * Enforces `static roles` declared on each message class. This is the single
 * authorization gate for every use case: routes only authenticate, they do not
 * decide who may do what, so a use case cannot be reached without its policy.
 */
export const authorizationMiddleware: Middleware = async (message, next) => {
  const { roles } = message.constructor as typeof Message
  if (roles) {
    if (!message.actor) throw new UnauthorizedError()
    if (!roles.includes(message.actor.role)) throw new ForbiddenError()
  }
  return next()
}
