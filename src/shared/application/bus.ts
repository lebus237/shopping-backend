import type { Command, Handler, Message, Query, ResultOf } from '#shared/application/message'

export type Next = () => Promise<unknown>
export type Middleware = (message: Message<unknown>, next: Next) => Promise<unknown>

type MessageClass<M extends Message<unknown>> = new (...args: any[]) => M

/**
 * One generic bus, instantiated twice (commands, queries) with different
 * middleware pipelines. Handlers are looked up by the message CLASS, not by
 * its name, so renaming or minifying cannot break routing, and registering a
 * handler whose type does not match the message fails to compile.
 */
export class Bus<TBase extends Message<unknown>> {
  private readonly handlers = new Map<Function, () => Handler<never>>()

  constructor(private readonly pipeline: Middleware[] = []) {}

  register<M extends TBase>(type: MessageClass<M>, factory: () => Handler<M>): void {
    if (this.handlers.has(type)) {
      throw new Error(`Handler already registered for ${type.name}`)
    }
    this.handlers.set(type, factory as () => Handler<never>)
  }

  async dispatch<M extends TBase>(message: M): Promise<ResultOf<M>> {
    const factory = this.handlers.get(message.constructor)
    if (!factory) {
      throw new Error(`No handler registered for ${message.constructor.name}`)
    }

    const core: Next = () => (factory() as unknown as Handler<M>).handle(message)
    const run = this.pipeline.reduceRight<Next>((next, mw) => () => mw(message, next), core)
    return (await run()) as ResultOf<M>
  }
}

export type CommandBus = Bus<Command<unknown>>
export type QueryBus = Bus<Query<unknown>>
