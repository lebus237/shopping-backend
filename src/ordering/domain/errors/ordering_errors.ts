import { DomainError, ErrorCategory } from '#shared/domain/errors/app_error'

export class OrderNotFoundError extends DomainError {
  constructor() {
    super('ORDER_NOT_FOUND', 'Order not found', ErrorCategory.NOT_FOUND)
  }
}

export class InvalidOrderError extends DomainError {
  constructor(message: string) {
    super('INVALID_ORDER', message, ErrorCategory.VALIDATION)
  }
}

export class InvalidOrderTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(
      'ORDER_STATUS_TRANSITION_INVALID',
      `Cannot move an order from ${from} to ${to}`,
      ErrorCategory.CONFLICT
    )
  }
}

export class ProductNotSellableError extends DomainError {
  constructor() {
    super('PRODUCT_NOT_SELLABLE', 'One or more products are unavailable', ErrorCategory.CONFLICT)
  }
}
