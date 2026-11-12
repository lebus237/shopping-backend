import type { DomainEvent } from '#shared/domain/domain_event'

/**
 * - in_transaction: runs inside the same DB transaction as the command. If it
 *   throws, the whole command rolls back. Use for invariants that must stay
 *   consistent (reserving stock, audit trail).
 * - after_commit: runs once the transaction has committed. Failures are logged
 *   and swallowed; the command already succeeded. Use for side effects
 *   (notifications).
 */
export type EventPhase = 'in_transaction' | 'after_commit'

type EventHandler<E extends DomainEvent> = (event: E) => Promise<void>

type EventClass<E extends DomainEvent> = new (...args: any[]) => E

interface Subscription {
  type: Function | '*'
  phase: EventPhase
  handler: EventHandler<DomainEvent>
}

export class EventDispatcher {
  private readonly subscriptions: Subscription[] = []

  on<E extends DomainEvent>(type: EventClass<E>, phase: EventPhase, handler: EventHandler<E>) {
    this.subscriptions.push({ type, phase, handler: handler as EventHandler<DomainEvent> })
  }

  onAny(phase: EventPhase, handler: EventHandler<DomainEvent>) {
    this.subscriptions.push({ type: '*', phase, handler })
  }

  async dispatch(event: DomainEvent, phase: EventPhase): Promise<void> {
    for (const sub of this.subscriptions) {
      if (sub.phase !== phase) continue
      if (sub.type === '*' || event instanceof sub.type) {
        await sub.handler(event)
      }
    }
  }
}
