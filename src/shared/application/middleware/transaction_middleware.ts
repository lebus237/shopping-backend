import type { Middleware } from '#shared/application/bus'
import type { UnitOfWork } from '#shared/application/unit_of_work'

/** Every command runs inside exactly one unit of work. */
export function transactionMiddleware(unitOfWork: UnitOfWork): Middleware {
  return (_message, next) => unitOfWork.run(next)
}
