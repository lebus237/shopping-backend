import { AggregateRoot } from '#shared/domain/aggregate_root'
import { newId, type ProductId } from '#shared/domain/ids'
import { ProductCreated, StockChanged } from '#catalog/domain/events'
import { InsufficientStockError, InvalidProductError } from '#catalog/domain/errors/catalog_errors'

export interface ProductSnapshot {
  id: ProductId
  sku: string
  name: string
  priceCents: number
  stock: number
  active: boolean
  version: number
}

const isNonNegativeInt = (n: number) => Number.isInteger(n) && n >= 0
const isPositiveInt = (n: number) => Number.isInteger(n) && n > 0

/**
 * Aggregate root. The constructor is private: the only ways in are
 * `create` (new product, validated, raises an event) and `reconstitute`
 * (rebuild from storage, trusted, silent). State changes only through
 * methods that enforce the invariants, so stock can never go negative.
 */
export class Product extends AggregateRoot {
  private constructor(
    readonly id: ProductId,
    readonly sku: string,
    private _name: string,
    private _priceCents: number,
    private _stock: number,
    private _active: boolean,
    version: number
  ) {
    super(version)
  }

  static create(input: { sku: string; name: string; priceCents: number; stock: number }): Product {
    const sku = input.sku.trim().toUpperCase()
    const name = input.name.trim()
    if (sku.length === 0) throw new InvalidProductError('sku is required')
    if (name.length === 0) throw new InvalidProductError('name is required')
    if (!isPositiveInt(input.priceCents)) {
      throw new InvalidProductError('priceCents must be a positive integer')
    }
    if (!isNonNegativeInt(input.stock)) {
      throw new InvalidProductError('stock must be a non-negative integer')
    }

    const product = new Product(
      newId<ProductId>(),
      sku,
      name,
      input.priceCents,
      input.stock,
      true,
      0
    )
    product.record(new ProductCreated(product.id, sku, input.stock))
    return product
  }

  static reconstitute(s: ProductSnapshot): Product {
    return new Product(s.id, s.sku, s.name, s.priceCents, s.stock, s.active, s.version)
  }

  get name() {
    return this._name
  }
  get priceCents() {
    return this._priceCents
  }
  get stock() {
    return this._stock
  }
  get active() {
    return this._active
  }

  /** Can customers order this product right now? */
  isSellable(): boolean {
    return this._active
  }

  reserve(quantity: number): void {
    if (!isPositiveInt(quantity))
      throw new InvalidProductError('quantity must be a positive integer')
    if (quantity > this._stock) throw new InsufficientStockError(this.sku, quantity, this._stock)
    this._stock -= quantity
    this.record(new StockChanged(this.id, -quantity, this._stock))
  }

  restock(quantity: number): void {
    if (!isPositiveInt(quantity))
      throw new InvalidProductError('quantity must be a positive integer')
    this._stock += quantity
    this.record(new StockChanged(this.id, quantity, this._stock))
  }

  activate(): void {
    this._active = true
  }

  deactivate(): void {
    this._active = false
  }

  toSnapshot(): ProductSnapshot {
    return {
      id: this.id,
      sku: this.sku,
      name: this._name,
      priceCents: this._priceCents,
      stock: this._stock,
      active: this._active,
      version: this.version,
    }
  }
}
