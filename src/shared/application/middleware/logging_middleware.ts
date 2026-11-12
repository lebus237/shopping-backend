import type { Middleware } from '#shared/application/bus'

export interface LogPort {
  info(obj: object, msg?: string): void
  warn(obj: object, msg?: string): void
}

export function loggingMiddleware(logger: LogPort): Middleware {
  return async (message, next) => {
    const started = performance.now()
    const name = message.constructor.name
    try {
      const result = await next()
      logger.info(
        { message: name, kind: message.kind, ms: Math.round(performance.now() - started) },
        'handled'
      )
      return result
    } catch (error) {
      logger.warn({ message: name, kind: message.kind, err: error }, 'failed')
      throw error
    }
  }
}
