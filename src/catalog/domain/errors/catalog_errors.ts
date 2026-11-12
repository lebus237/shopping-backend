import { DomainError, ErrorCategory } from '#shared/domain/errors/app_error'

export class ProductNotFoundError extends DomainError {
  constructor() {
    super('PRODUCT_NOT_FOUND', 'Product not found', ErrorCategory.NOT_FOUND)
  }
}

export class InsufficientStockError extends DomainError {
  constructor(sku: string, requested: number, available: number) {
    super('INSUFFICIENT_STOCK', `Not enough stock for ${sku}`, ErrorCategory.CONFLICT, {
      sku,
      requested,
      available,
    })
  }
}

export class ProductAlreadyExistsError extends DomainError {
  constructor(sku: string) {
    super(
      'PRODUCT_ALREADY_EXISTS',
      `A product with sku ${sku} already exists`,
      ErrorCategory.CONFLICT
    )
  }
}

export class InvalidProductError extends DomainError {
  constructor(message: string) {
    super('INVALID_PRODUCT', message, ErrorCategory.VALIDATION)
  }
}
