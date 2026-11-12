import { DomainError, ErrorCategory } from '#shared/domain/errors/app_error'

export class UserAlreadyExistsError extends DomainError {
  constructor() {
    super(
      'USER_ALREADY_EXISTS',
      'An account with this email already exists',
      ErrorCategory.CONFLICT
    )
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('INVALID_CREDENTIALS', 'Invalid email or password', ErrorCategory.UNAUTHORIZED)
  }
}

export class InvalidUserError extends DomainError {
  constructor(message: string) {
    super('INVALID_USER', message, ErrorCategory.VALIDATION)
  }
}

export class UserNotFoundError extends DomainError {
  constructor() {
    super('USER_NOT_FOUND', 'User not found', ErrorCategory.NOT_FOUND)
  }
}
