import { DomainEvent } from '#shared/domain/domain_event'
import type { UserId } from '#shared/domain/ids'

export class UserRegistered extends DomainEvent {
  constructor(
    readonly aggregateId: UserId,
    readonly email: string
  ) {
    super()
  }
  payload() {
    return { email: this.email }
  }
}
