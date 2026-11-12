import { AggregateRoot } from '#shared/domain/aggregate_root'
import type { Role } from '#shared/domain/actor'
import { newId, type UserId } from '#shared/domain/ids'
import { UserRegistered } from '#identity/domain/events'
import { InvalidUserError } from '#identity/domain/errors/identity_errors'

export interface UserSnapshot {
  id: UserId
  email: string
  passwordHash: string
  role: Role
  version: number
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class User extends AggregateRoot {
  private constructor(
    readonly id: UserId,
    readonly email: string,
    readonly passwordHash: string,
    readonly role: Role,
    version: number
  ) {
    super(version)
  }

  /** Public sign-up always yields a customer; admins are provisioned out of band. */
  static register(input: { email: string; passwordHash: string }): User {
    const email = input.email.trim().toLowerCase()
    if (!EMAIL.test(email)) throw new InvalidUserError('email is not valid')
    if (input.passwordHash.length === 0) throw new InvalidUserError('password is required')

    const user = new User(newId<UserId>(), email, input.passwordHash, 'customer', 0)
    user.record(new UserRegistered(user.id, email))
    return user
  }

  static reconstitute(s: UserSnapshot): User {
    return new User(s.id, s.email, s.passwordHash, s.role, s.version)
  }

  toSnapshot(): UserSnapshot {
    return {
      id: this.id,
      email: this.email,
      passwordHash: this.passwordHash,
      role: this.role,
      version: this.version,
    }
  }
}
