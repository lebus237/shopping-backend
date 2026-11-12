import type { EventDispatcher } from '#shared/application/event_dispatcher'
import type { LucidUnitOfWork } from '#shared/infrastructure/lucid_unit_of_work'

/**
 * Records every domain event in the same transaction as the change that
 * caused it, so the audit trail can never disagree with the data.
 */
export function registerAuditLog(dispatcher: EventDispatcher, uow: LucidUnitOfWork): void {
  dispatcher.onAny('in_transaction', async (event) => {
    await uow.client.table('audit_log').insert({
      event_type: event.type,
      aggregate_id: event.aggregateId,
      payload: JSON.stringify(event.payload()),
      occurred_at: event.occurredAt,
    })
  })
}
