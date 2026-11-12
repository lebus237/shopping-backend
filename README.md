# shopping-backend

A deliberately tiny shopping API (products, orders, users) built to **study DDD + CQRS on AdonisJS 6**.
The business is trivial on purpose; the architecture is the point.
It is a rework of `digital-notes-backend` with every weakness found in that codebase fixed — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the pattern map and the "what changed and why" table.

## Run it

```bash
npm install
cp .env.example .env && node ace generate:key   # then paste the key into APP_KEY if needed
createdb shopping && node ace migration:run
npm run dev
```

## Test it

```bash
npm run test:db:start      # Postgres 16 on :5433 (docker-compose.test.yml)
npm run typecheck && npm run lint
npm run test:unit          # pure domain / bus / architecture tests, no database
npm test                   # unit + functional (HTTP + real Postgres)
```

## API

| Method | Path                              | Who                          | Command / Query                         |
| ------ | --------------------------------- | ---------------------------- | --------------------------------------- |
| POST   | `/api/auth/register`              | public                       | `RegisterUserCommand`                   |
| POST   | `/api/auth/login`                 | public                       | `LoginCommand`                          |
| GET    | `/api/auth/me`                    | any user                     | `GetMeQuery`                            |
| GET    | `/api/products[?q=&page=]`        | public (admin sees inactive) | `ListProductsQuery`                     |
| GET    | `/api/products/:id`               | public                       | `GetProductQuery`                       |
| POST   | `/api/admin/products`             | admin                        | `CreateProductCommand`                  |
| POST   | `/api/admin/products/:id/restock` | admin                        | `RestockProductCommand`                 |
| PATCH  | `/api/admin/products/:id/active`  | admin                        | `SetProductActiveCommand`               |
| POST   | `/api/orders`                     | any user                     | `PlaceOrderCommand`                     |
| GET    | `/api/orders`, `/api/orders/:id`  | owner (admin: any)           | `ListMyOrdersQuery`, `GetOrderQuery`    |
| POST   | `/api/orders/:id/pay`, `/cancel`  | owner (admin: any)           | `PayOrderCommand`, `CancelOrderCommand` |
| POST   | `/api/admin/orders/:id/ship`      | admin                        | `ShipOrderCommand`                      |

Admins cannot self-register; promote a user with `UPDATE users SET role = 'admin' WHERE email = '...'`.
