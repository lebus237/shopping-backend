import { AsyncLocalStorage } from 'node:async_hooks'
import type { Database } from '@adonisjs/lucid/database'
import type { QueryClientContract, TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { UnitOfWork } from '#shared/application/unit_of_work'
import type { EventDispatcher } from '#shared/application/event_dispatcher'
import type { DomainEvent } from '#shared/domain/domain_event'

interface Scope {
  trx: TransactionClientContract
  queue: DomainEvent[]
  processed: DomainEvent[]
}

/**
 * Transaction boundary + event outbox for one command.
 *
 * Repositories never open transactions. They ask `client` for "the current
 * connection" (the active transaction inside `run`, the pool otherwise) and
 * hand the events of the aggregates they save to `collect`. AsyncLocalStorage
 * carries the scope across awaits so nothing has to be threaded through.
 *
 *   run(work)
 *     BEGIN
 *       work()                                   <- handlers + repositories
 *       drain queue -> in_transaction handlers   <- may enqueue more events
 *     COMMIT
 *     after_commit handlers                      <- failures logged, not thrown
 */
export class LucidUnitOfWork implements UnitOfWork {
  private readonly storage = new AsyncLocalStorage<Scope>()

  constructor(
    private readonly db: Database,
    private readonly dispatcher: EventDispatcher,
    private readonly onAfterCommitError: (error: unknown, event: DomainEvent) => void = () => {}
  ) {}

  /** Current connection: the transaction when inside `run`, else the pool. */
  get client(): QueryClientContract {
    return this.storage.getStore()?.trx ?? this.db.connection()
  }

  /** Called by repositories after persisting an aggregate. */
  collect(events: DomainEvent[]): void {
    const scope = this.storage.getStore()
    if (!scope) {
      throw new Error('Domain events can only be collected inside a unit of work')
    }
    scope.queue.push(...events)
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    // Nested call (e.g. a command dispatched from an event handler): join.
    if (this.storage.getStore()) return work()

    const trx = await this.db.transaction()
    const scope: Scope = { trx, queue: [], processed: [] }

    let result: T
    try {
      result = await this.storage.run(scope, async () => {
        const value = await work()
        while (scope.queue.length > 0) {
          const event = scope.queue.shift()!
          scope.processed.push(event)
          await this.dispatcher.dispatch(event, 'in_transaction')
        }
        return value
      })
      await trx.commit()
    } catch (error) {
      if (!trx.isCompleted) await trx.rollback()
      throw error
    }

    for (const event of scope.processed) {
      try {
        await this.dispatcher.dispatch(event, 'after_commit')
      } catch (error) {
        this.onAfterCommitError(error, event)
      }
    }
    return result
  }
}
