import type { Handler } from '#shared/application/message'
import type { ProductId } from '#shared/domain/ids'
import { Product } from '#catalog/domain/product'
import type { ProductRepository } from '#catalog/domain/product_repository'
import {
  ProductAlreadyExistsError,
  ProductNotFoundError,
} from '#catalog/domain/errors/catalog_errors'
import type {
  CreateProductCommand,
  RestockProductCommand,
  SetProductActiveCommand,
} from '#catalog/application/commands/product_commands'

/**
 * Handlers orchestrate: load aggregate, call a domain method, save. Business
 * rules live in `Product`, not here.
 */
export class CreateProductHandler implements Handler<CreateProductCommand> {
  constructor(private readonly products: ProductRepository) {}

  async handle(command: CreateProductCommand): Promise<ProductId> {
    const product = Product.create({
      sku: command.sku,
      name: command.name,
      priceCents: command.priceCents,
      stock: command.stock,
    })
    if (await this.products.existsBySku(product.sku)) {
      throw new ProductAlreadyExistsError(product.sku)
    }
    await this.products.save(product)
    return product.id
  }
}

export class RestockProductHandler implements Handler<RestockProductCommand> {
  constructor(private readonly products: ProductRepository) {}

  async handle(command: RestockProductCommand): Promise<void> {
    const product = await this.products.findById(command.productId)
    if (!product) throw new ProductNotFoundError()
    product.restock(command.quantity)
    await this.products.save(product)
  }
}

export class SetProductActiveHandler implements Handler<SetProductActiveCommand> {
  constructor(private readonly products: ProductRepository) {}

  async handle(command: SetProductActiveCommand): Promise<void> {
    const product = await this.products.findById(command.productId)
    if (!product) throw new ProductNotFoundError()
    if (command.active) product.activate()
    else product.deactivate()
    await this.products.save(product)
  }
}
