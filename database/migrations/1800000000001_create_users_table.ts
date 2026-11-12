import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('users', (t) => {
      t.uuid('id').primary()
      t.string('email', 254).notNullable().unique()
      t.string('password_hash').notNullable()
      t.string('role', 20).notNullable().defaultTo('customer')
      t.integer('version').notNullable().defaultTo(1)
      t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      t.timestamp('updated_at', { useTz: true }).nullable()
    })
    this.schema.raw(
      `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer','admin'))`
    )

    this.schema.createTable('auth_access_tokens', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.uuid('tokenable_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      t.string('type').notNullable()
      t.string('name').nullable()
      t.string('hash').notNullable()
      t.text('abilities').notNullable()
      t.timestamp('created_at')
      t.timestamp('updated_at')
      t.timestamp('last_used_at').nullable()
      t.timestamp('expires_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable('auth_access_tokens')
    this.schema.dropTable('users')
  }
}
