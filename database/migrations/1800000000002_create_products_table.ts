import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('products', (t) => {
      t.uuid('id').primary()
      t.string('sku', 64).notNullable().unique()
      t.string('name', 200).notNullable()
      t.integer('price_cents').notNullable()
      t.integer('stock').notNullable()
      t.boolean('active').notNullable().defaultTo(true)
      t.integer('version').notNullable().defaultTo(1)
      t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      t.timestamp('updated_at', { useTz: true }).nullable()
    })
    // Defence in depth: the aggregate already forbids this, the database
    // guarantees it even if some future code path forgets.
    this.schema.raw('ALTER TABLE products ADD CONSTRAINT products_stock_check CHECK (stock >= 0)')
    this.schema.raw(
      'ALTER TABLE products ADD CONSTRAINT products_price_check CHECK (price_cents > 0)'
    )
  }

  async down() {
    this.schema.dropTable('products')
  }
}
