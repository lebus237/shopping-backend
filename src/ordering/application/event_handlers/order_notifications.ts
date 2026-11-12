import type { EventDispatcher } from '#shared/application/event_dispatcher'
import type { LogPort } from '#shared/application/middleware/logging_middleware'
import { OrderPlaced } from '#ordering/domain/events'

/**
 * After-commit side effect: only runs if the order really was stored. A real
 * app would send an email here; a failure must not undo the order, which is
 * why this phase swallows (and logs) errors.
 */
export function registerOrderNotifications(dispatcher: EventDispatcher, logger: LogPort): void {
  dispatcher.on(OrderPlaced, 'after_commit', async (event) => {
    logger.info(
      { orderId: event.aggregateId, customerId: event.customerId },
      'order confirmation sent'
    )
  })
}
