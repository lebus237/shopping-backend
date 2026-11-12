import type { Actor, Role } from '#shared/domain/actor'

/**
 * A request addressed to the application: a Command (changes state) or a
 * Query (reads state). Both carry the acting user explicitly.
 *
 * `TResult` is a phantom type: it never exists at runtime, but it lets
 * `bus.dispatch(command)` infer the correct return type with no casts.
 */
export abstract class Message<TResult> {
  declare readonly __result: TResult
  abstract readonly kind: 'command' | 'query'
  abstract readonly actor: Actor | null

  /**
   * Roles allowed to send this message, declared on the message class itself
   * so the policy sits next to the use case. `undefined` means public.
   */
  static readonly roles: readonly Role[] | undefined = undefined
}

export abstract class Command<TResult = void> extends Message<TResult> {
  readonly kind = 'command' as const
}

export abstract class Query<TResult> extends Message<TResult> {
  readonly kind = 'query' as const
}

export type ResultOf<M> = M extends Message<infer R> ? R : never

export interface Handler<M extends Message<unknown>> {
  handle(message: M): Promise<ResultOf<M>>
}
