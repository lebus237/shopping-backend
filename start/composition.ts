import type { Database } from '@adonisjs/lucid/database'
import { Bus, type CommandBus, type QueryBus } from '#shared/application/bus'
import type { Command, Query } from '#shared/application/message'
import { EventDispatcher } from '#shared/application/event_dispatcher'
import { authorizationMiddleware } from '#shared/application/middleware/authorization_middleware'
import { loggingMiddleware, type LogPort } from '#shared/application/middleware/logging_middleware'
import { transactionMiddleware } from '#shared/application/middleware/transaction_middleware'
import { LucidUnitOfWork } from '#shared/infrastructure/lucid_unit_of_work'
import { registerAuditLog } from '#shared/infrastructure/audit_log'

import { LucidProductRepository } from '#catalog/infrastructure/lucid_product_repository'
import { LucidProductReadModel } from '#catalog/infrastructure/lucid_product_read_model'
import {
  CreateProductCommand,
  RestockProductCommand,
  SetProductActiveCommand,
} from '#catalog/application/commands/product_commands'
import { GetProductQuery, ListProductsQuery } from '#catalog/application/queries/product_queries'
import {
  CreateProductHandler,
  RestockProductHandler,
  SetProductActiveHandler,
} from '#catalog/application/handlers/product_command_handlers'
import {
  GetProductHandler,
  ListProductsHandler,
} from '#catalog/application/handlers/product_query_handlers'
import { registerStockEventHandlers } from '#catalog/application/event_handlers/stock_event_handlers'

import { LucidOrderRepository } from '#ordering/infrastructure/lucid_order_repository'
import { LucidOrderReadModel } from '#ordering/infrastructure/lucid_order_read_model'
import { CatalogAdapter } from '#ordering/infrastructure/catalog_adapter'
import {
  CancelOrderCommand,
  PayOrderCommand,
  PlaceOrderCommand,
  ShipOrderCommand,
} from '#ordering/application/commands/order_commands'
import { GetOrderQuery, ListMyOrdersQuery } from '#ordering/application/queries/order_queries'
import {
  CancelOrderHandler,
  PayOrderHandler,
  PlaceOrderHandler,
  ShipOrderHandler,
} from '#ordering/application/handlers/order_command_handlers'
import {
  GetOrderHandler,
  ListMyOrdersHandler,
} from '#ordering/application/handlers/order_query_handlers'
import { registerOrderNotifications } from '#ordering/application/event_handlers/order_notifications'

import { LucidUserRepository } from '#identity/infrastructure/lucid_user_repository'
import { LoginCommand, RegisterUserCommand } from '#identity/application/commands/user_commands'
import { GetMeQuery } from '#identity/application/queries/user_queries'
import {
  GetMeHandler,
  LoginHandler,
  RegisterUserHandler,
} from '#identity/application/handlers/user_handlers'
import type { PasswordHasher, TokenIssuer } from '#identity/application/ports'

export interface Dependencies {
  db: Database
  hasher: PasswordHasher
  tokens: TokenIssuer
  logger: LogPort
}

export interface Application {
  commandBus: CommandBus
  queryBus: QueryBus
}

/**
 * Composition root: the ONLY file that knows every concrete class. Handlers
 * receive their collaborators through typed constructors, so a wrong or
 * reordered dependency is a compile error (the old string-token arrays only
 * failed at runtime). Nothing else in the codebase uses a service locator.
 */
export function buildApplication(deps: Dependencies): Application {
  const { db, hasher, tokens, logger } = deps

  // --- infrastructure shared by every context
  const dispatcher = new EventDispatcher()
  const uow = new LucidUnitOfWork(db, dispatcher, (error, event) =>
    logger.warn({ err: error, event: event.type }, 'after-commit event handler failed')
  )

  // --- write side
  const products = new LucidProductRepository(uow)
  const orders = new LucidOrderRepository(uow)
  const users = new LucidUserRepository(uow)
  const catalog = new CatalogAdapter(products)

  // --- read side
  const productReadModel = new LucidProductReadModel(db)
  const orderReadModel = new LucidOrderReadModel(db)

  // --- event subscriptions
  registerAuditLog(dispatcher, uow)
  registerStockEventHandlers(dispatcher, products)
  registerOrderNotifications(dispatcher, logger)

  // --- buses: the order of the pipeline is the order of execution
  const commandBus: CommandBus = new Bus<Command<unknown>>([
    loggingMiddleware(logger),
    authorizationMiddleware,
    transactionMiddleware(uow),
  ])
  const queryBus: QueryBus = new Bus<Query<unknown>>([
    loggingMiddleware(logger),
    authorizationMiddleware,
  ])

  // identity
  commandBus.register(RegisterUserCommand, () => new RegisterUserHandler(users, hasher))
  commandBus.register(LoginCommand, () => new LoginHandler(users, hasher, tokens))
  queryBus.register(GetMeQuery, () => new GetMeHandler(users))

  // catalog
  commandBus.register(CreateProductCommand, () => new CreateProductHandler(products))
  commandBus.register(RestockProductCommand, () => new RestockProductHandler(products))
  commandBus.register(SetProductActiveCommand, () => new SetProductActiveHandler(products))
  queryBus.register(ListProductsQuery, () => new ListProductsHandler(productReadModel))
  queryBus.register(GetProductQuery, () => new GetProductHandler(productReadModel))

  // ordering
  commandBus.register(PlaceOrderCommand, () => new PlaceOrderHandler(orders, catalog))
  commandBus.register(PayOrderCommand, () => new PayOrderHandler(orders))
  commandBus.register(CancelOrderCommand, () => new CancelOrderHandler(orders))
  commandBus.register(ShipOrderCommand, () => new ShipOrderHandler(orders))
  queryBus.register(GetOrderQuery, () => new GetOrderHandler(orderReadModel))
  queryBus.register(ListMyOrdersQuery, () => new ListMyOrdersHandler(orderReadModel))

  return { commandBus, queryBus }
}
