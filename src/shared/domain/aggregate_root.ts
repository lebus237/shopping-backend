import { DomainEvent } from '#shared/domain/domain_event'

/**
 * Base class for aggregates. It owns two cross-cutting concerns so that
 * entities themselves stay free of persistence details:
 *  - `version`: optimistic-concurrency token (0 means "never persisted")
 *  - recorded domain events, drained by the repository on save
 */
export abstract class AggregateRoot {
  private events: DomainEvent[] = []

  protected constructor(public readonly version: number) {}

  get isNew(): boolean {
    return this.version === 0
  }

  protected record(event: DomainEvent): void {
    this.events.push(event)
  }

  pullEvents(): DomainEvent[] {
    const pending = this.events
    this.events = []
    return pending
  }
}
