import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('audit_log', (t) => {
      t.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      t.string('event_type', 100).notNullable()
      t.string('aggregate_id', 64).notNullable()
      t.jsonb('payload').notNullable()
      t.timestamp('occurred_at', { useTz: true }).notNullable()
      t.index(['aggregate_id'])
    })
  }

  async down() {
    this.schema.dropTable('audit_log')
  }
}
