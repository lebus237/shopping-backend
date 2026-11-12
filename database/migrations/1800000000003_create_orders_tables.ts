import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('orders', (t) => {
      t.uuid('id').primary()
      t.uuid('customer_id').notNullable().references('id').inTable('users')
      t.string('status', 20).notNullable()
      t.timestamp('placed_at', { useTz: true }).notNullable()
      t.integer('version').notNullable().defaultTo(1)
      t.timestamp('updated_at', { useTz: true }).nullable()
      t.index(['customer_id', 'placed_at'])
    })

    this.schema.createTable('order_lines', (t) => {
      t.increments('id')
      t.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE')
      // Deliberately NOT a foreign key to products: the line is a snapshot,
      // and Ordering must not be coupled to Catalog's tables.
      t.uuid('product_id').notNullable()
      t.string('product_name', 200).notNullable()
      t.integer('unit_price_cents').notNullable()
      t.integer('quantity').notNullable()
      t.unique(['order_id', 'product_id'])
    })
    this.schema.raw(
      'ALTER TABLE order_lines ADD CONSTRAINT order_lines_qty_check CHECK (quantity > 0)'
    )
  }

  async down() {
    this.schema.dropTable('order_lines')
    this.schema.dropTable('orders')
  }
}
