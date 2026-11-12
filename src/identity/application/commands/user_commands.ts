import { Command } from '#shared/application/message'
import type { UserId } from '#shared/domain/ids'

/** Public use cases: no actor yet. */
export class RegisterUserCommand extends Command<UserId> {
  readonly actor = null
  constructor(
    readonly email: string,
    readonly password: string
  ) {
    super()
  }
}

export class LoginCommand extends Command<string> {
  readonly actor = null
  constructor(
    readonly email: string,
    readonly password: string
  ) {
    super()
  }
}
