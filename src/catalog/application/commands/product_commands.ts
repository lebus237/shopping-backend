import { Command } from '#shared/application/message'
import type { Actor, Role } from '#shared/domain/actor'
import type { ProductId } from '#shared/domain/ids'

const ADMIN: readonly Role[] = ['admin']

export class CreateProductCommand extends Command<ProductId> {
  static override readonly roles = ADMIN
  constructor(
    readonly actor: Actor,
    readonly sku: string,
    readonly name: string,
    readonly priceCents: number,
    readonly stock: number
  ) {
    super()
  }
}

export class RestockProductCommand extends Command {
  static override readonly roles = ADMIN
  constructor(
    readonly actor: Actor,
    readonly productId: ProductId,
    readonly quantity: number
  ) {
    super()
  }
}

export class SetProductActiveCommand extends Command {
  static override readonly roles = ADMIN
  constructor(
    readonly actor: Actor,
    readonly productId: ProductId,
    readonly active: boolean
  ) {
    super()
  }
}
