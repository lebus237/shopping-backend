import { randomUUID } from 'node:crypto'
import { AppError, ErrorCategory } from '#shared/domain/errors/app_error'

/**
 * Branded identifiers. At runtime they are plain UUID strings; at compile time
 * a ProductId can never be passed where an OrderId is expected.
 */
declare const brand: unique symbol
export type Id<TBrand extends string> = string & { readonly [brand]: TBrand }

export type UserId = Id<'User'>
export type ProductId = Id<'Product'>
export type OrderId = Id<'Order'>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function newId<T extends Id<string>>(): T {
  return randomUUID() as T
}

/** Validates untrusted input (route params, JSON bodies) and brands it. */
export function parseId<T extends Id<string>>(value: unknown, label = 'id'): T {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw new AppError('INVALID_ID', `Invalid ${label}`, ErrorCategory.VALIDATION)
  }
  return value as T
}
