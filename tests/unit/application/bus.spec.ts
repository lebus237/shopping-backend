import { test } from '@japa/runner'
import { Bus, type Middleware } from '#shared/application/bus'
import { Command, Query, type Handler } from '#shared/application/message'
import { authorizationMiddleware } from '#shared/application/middleware/authorization_middleware'
import { newId, type UserId } from '#shared/domain/ids'
import type { Actor } from '#shared/domain/actor'

class Echo extends Command<string> {
  readonly actor = null
  constructor(readonly text: string) {
    super()
  }
}
class AdminOnly extends Query<string> {
  static override readonly roles = ['admin'] as const
  constructor(readonly actor: Actor | null) {
    super()
  }
}

class EchoHandler implements Handler<Echo> {
  async handle(c: Echo) {
    return c.text.toUpperCase()
  }
}
class AdminOnlyHandler implements Handler<AdminOnly> {
  async handle() {
    return 'secret'
  }
}

test.group('Bus', () => {
  test('routes by message class and returns the typed result', async ({ assert }) => {
    const bus = new Bus<Command<unknown>>()
    bus.register(Echo, () => new EchoHandler())
    const result: string = await bus.dispatch(new Echo('hi'))
    assert.equal(result, 'HI')
  })

  test('fails loudly for unregistered messages and duplicate handlers', async ({ assert }) => {
    const bus = new Bus<Command<unknown>>()
    await assert.rejects(() => bus.dispatch(new Echo('x')), /No handler registered for Echo/)
    bus.register(Echo, () => new EchoHandler())
    assert.throws(() => bus.register(Echo, () => new EchoHandler()), /already registered/)
  })

  test('middleware wraps the handler in declaration order', async ({ assert }) => {
    const trace: string[] = []
    const mw =
      (name: string): Middleware =>
      async (_m, next) => {
        trace.push(`${name}:before`)
        const r = await next()
        trace.push(`${name}:after`)
        return r
      }
    const bus = new Bus<Command<unknown>>([mw('a'), mw('b')])
    bus.register(Echo, () => new EchoHandler())
    await bus.dispatch(new Echo('x'))
    assert.deepEqual(trace, ['a:before', 'b:before', 'b:after', 'a:after'])
  })
})

test.group('Authorization middleware', () => {
  const bus = new Bus<Query<unknown>>([authorizationMiddleware])
  bus.register(AdminOnly, () => new AdminOnlyHandler())
  const as = (role: Actor['role']): Actor => ({ userId: newId<UserId>(), role })

  test('anonymous -> 401, wrong role -> 403, right role -> ok', async ({ assert }) => {
    await assert.rejects(() => bus.dispatch(new AdminOnly(null)), /Authentication required/)
    await assert.rejects(() => bus.dispatch(new AdminOnly(as('customer'))), /not allowed/)
    assert.equal(await bus.dispatch(new AdminOnly(as('admin'))), 'secret')
  })
})
