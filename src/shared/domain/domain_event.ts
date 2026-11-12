/**
 * A fact that happened inside an aggregate. Events are named in the past tense,
 * carry only primitives, and are the contract between bounded contexts.
 */
export abstract class DomainEvent {
  readonly occurredAt: Date = new Date()

  /** Id of the aggregate that produced the event. */
  abstract readonly aggregateId: string

  /** Primitive payload, stored as-is in the audit log. */
  abstract payload(): Record<string, unknown>

  get type(): string {
    return this.constructor.name
  }
}
