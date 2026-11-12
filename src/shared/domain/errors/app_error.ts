export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL = 'INTERNAL',
}

/**
 * Base class of every error the application raises on purpose. The HTTP layer
 * maps `category` to a status code; nothing in here knows about HTTP.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly category: ErrorCategory,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = new.target.name
  }
}

/** A business rule was broken inside the domain model. */
export class DomainError extends AppError {}

/** An optimistic-lock failure: someone else changed the aggregate first. */
export class ConcurrencyError extends AppError {
  constructor(aggregate: string) {
    super(
      'CONCURRENT_MODIFICATION',
      `${aggregate} was modified by another request, please retry`,
      ErrorCategory.CONFLICT
    )
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You are not allowed to perform this action') {
    super('FORBIDDEN', message, ErrorCategory.FORBIDDEN)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, ErrorCategory.UNAUTHORIZED)
  }
}
