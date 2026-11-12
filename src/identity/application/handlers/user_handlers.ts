import type { Handler } from '#shared/application/message'
import type { UserId } from '#shared/domain/ids'
import { User } from '#identity/domain/user'
import type { UserRepository } from '#identity/domain/user_repository'
import {
  InvalidCredentialsError,
  InvalidUserError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from '#identity/domain/errors/identity_errors'
import type { PasswordHasher, TokenIssuer, UserDto } from '#identity/application/ports'
import type {
  LoginCommand,
  RegisterUserCommand,
} from '#identity/application/commands/user_commands'
import type { GetMeQuery } from '#identity/application/queries/user_queries'

export class RegisterUserHandler implements Handler<RegisterUserCommand> {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher
  ) {}

  async handle(command: RegisterUserCommand): Promise<UserId> {
    if (command.password.length < 8) {
      throw new InvalidUserError('password must be at least 8 characters')
    }
    const user = User.register({
      email: command.email,
      passwordHash: await this.hasher.hash(command.password),
    })
    if (await this.users.findByEmail(user.email)) throw new UserAlreadyExistsError()
    await this.users.save(user)
    return user.id
  }
}

export class LoginHandler implements Handler<LoginCommand> {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenIssuer
  ) {}

  async handle(command: LoginCommand): Promise<string> {
    const user = await this.users.findByEmail(command.email.trim().toLowerCase())
    if (!user || !(await this.hasher.verify(user.passwordHash, command.password))) {
      throw new InvalidCredentialsError()
    }
    return this.tokens.issue(user.id)
  }
}

/**
 * Reads straight through the repository: for a one-row lookup a dedicated read
 * model would be ceremony. The query still goes through the QueryBus, so it
 * gets logging and authorization like every other read.
 */
export class GetMeHandler implements Handler<GetMeQuery> {
  constructor(private readonly users: UserRepository) {}

  async handle(query: GetMeQuery): Promise<UserDto> {
    const user = await this.users.findById(query.actor.userId)
    if (!user) throw new UserNotFoundError()
    return { id: user.id, email: user.email, role: user.role }
  }
}
