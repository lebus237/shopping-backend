import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const ProductController = () => import('#controllers/product_controller')
const OrderController = () => import('#controllers/order_controller')

/**
 * Routes only AUTHENTICATE (`auth` middleware). Who may do what is declared on
 * each command/query class (`static roles`) and enforced by the bus, so the
 * `/admin` prefix is a naming convention, not the security boundary.
 */
router
  .group(() => {
    router.post('/auth/register', [AuthController, 'register'])
    router.post('/auth/login', [AuthController, 'login'])
    router.get('/auth/me', [AuthController, 'me']).use(middleware.auth())

    router.get('/products', [ProductController, 'index'])
    router.get('/products/:id', [ProductController, 'show'])

    router
      .group(() => {
        router.post('/products', [ProductController, 'store'])
        router.post('/products/:id/restock', [ProductController, 'restock'])
        router.patch('/products/:id/active', [ProductController, 'setActive'])
        router.post('/orders/:id/ship', [OrderController, 'ship'])
      })
      .prefix('/admin')
      .use(middleware.auth())

    router
      .group(() => {
        router.post('/orders', [OrderController, 'store'])
        router.get('/orders', [OrderController, 'index'])
        router.get('/orders/:id', [OrderController, 'show'])
        router.post('/orders/:id/pay', [OrderController, 'pay'])
        router.post('/orders/:id/cancel', [OrderController, 'cancel'])
      })
      .use(middleware.auth())
  })
  .prefix('/api')
