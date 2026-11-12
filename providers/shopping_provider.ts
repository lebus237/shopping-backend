import type { ApplicationService } from '@adonisjs/core/types'
import { buildApplication } from '#start/composition'
import { AccessTokenIssuer } from '#identity/infrastructure/access_token_issuer'
import AuthController from '#controllers/auth_controller'
import ProductController from '#controllers/product_controller'
import OrderController from '#controllers/order_controller'

/**
 * Bridges Adonis and the application: builds the buses once from real
 * services, and hands them to the (thin) HTTP controllers.
 */
export default class ShoppingProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('application', async (resolver) => {
      const db = await resolver.make('lucid.db')
      const hash = await resolver.make('hash')
      const logger = await resolver.make('logger')

      return buildApplication({
        db,
        logger,
        tokens: new AccessTokenIssuer(),
        hasher: {
          hash: (plain) => hash.make(plain),
          verify: (hashed, plain) => hash.verify(hashed, plain),
        },
      })
    })

    const controllers = [AuthController, ProductController, OrderController] as const
    for (const Controller of controllers) {
      this.app.container.bind(Controller, async (resolver) => {
        const { commandBus, queryBus } = await resolver.make('application')
        return new Controller(commandBus, queryBus)
      })
    }
  }
}
