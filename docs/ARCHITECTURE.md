# Architecture guide

## Layout

```
app/                    HTTP only: controllers, validators, error handler
start/composition.ts    the ONE place that wires concrete classes together
providers/              Adonis glue: builds the buses, binds controllers
src/
  shared/               kernel: Message/Bus, middleware, UnitOfWork, events, ids, errors
  catalog/   domain/ application/ infrastructure/     Product
  ordering/  domain/ application/ infrastructure/     Order (+ lines)
  identity/  domain/ application/ infrastructure/     User
```

Dependency rule (enforced by `tests/unit/architecture.spec.ts`):
`domain` imports nothing from `application`, `infrastructure` or Adonis;
`application` never imports `infrastructure`; contexts never import each other's
aggregates — only published events (`ordering/domain/events`) and one anti-corruption adapter.

## A request, end to end

```
HTTP -> controller (validate, build command with actor)
     -> CommandBus pipeline: logging -> authorization(static roles) -> transaction
          -> handler: load aggregate -> call domain method -> repository.save
               save = UPDATE ... WHERE version = ?   (optimistic lock)
                    + uow.collect(aggregate.pullEvents())
          -> in_transaction event handlers (may raise more events)   e.g. reserve stock, audit log
     COMMIT
     -> after_commit event handlers                                  e.g. confirmation notice
```

Queries take the shorter road: `QueryBus: logging -> authorization -> handler -> ReadModel (plain SQL -> DTO)`.

## What changed vs digital-notes-backend

| Weakness in the original                                                     | Fix here                                                                                                                  | Where                                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Query side bypassed the QueryBus; `CQRSRegistry` was dead code               | Real query handlers behind a `QueryBus`; one `Bus` class, no registry duplicate                                           | `shared/application/bus.ts`, `*/application/handlers/*_query_handlers.ts`   |
| Anemic entities, 14-arg public constructors, invariants in handlers          | Private constructors, `create`/`place` factories, `reconstitute` for storage; invariants inside the aggregate             | `catalog/domain/product.ts`, `ordering/domain/order.ts`                     |
| Missing guards (`archive()` on anything, edit after publish)                 | Every transition is guarded; unit-tested                                                                                  | `tests/unit/domain/*`                                                       |
| No domain events                                                             | Aggregates record events; dispatcher with `in_transaction` and `after_commit` phases                                      | `shared/domain/aggregate_root.ts`, `shared/application/event_dispatcher.ts` |
| No transactions; multi-step writes could half-succeed                        | `TransactionMiddleware` + `LucidUnitOfWork` (AsyncLocalStorage); order + stock + audit commit or roll back together       | `shared/infrastructure/lucid_unit_of_work.ts`                               |
| Delete-all-then-reinsert child rows on every save                            | Lines are immutable after placement and only inserted; updates touch only the order row                                   | `ordering/infrastructure/lucid_order_repository.ts`                         |
| Last-writer-wins on whole aggregates                                         | `version` column; `UPDATE ... WHERE version = ?`; `ConcurrencyError` -> 409                                               | `*_repository.ts`                                                           |
| Handlers had no actor; ownership/audit impossible                            | Every message carries `actor`; aggregate decides ownership (`Order.pay(actor)`), strangers get 404                        | `shared/application/message.ts`                                             |
| Authorization only in route middleware; a visibility flag was never applied  | Policy is `static roles` on each message class, enforced in the bus; visibility is a handler decision, never a URL filter | `authorization_middleware.ts`, `product_query_handlers.ts`                  |
| String-token DI (`'NoteRepository'`) matched by position; `constructor.name` | Messages routed by class identity; typed constructor injection in one composition root                                    | `start/composition.ts`                                                      |
| Service locator inside controllers (`app.container.make`)                    | Buses injected into controllers by the provider                                                                           | `providers/shopping_provider.ts`                                            |
| 78 `as any` at mapping edges                                                 | Typed row interfaces + explicit `toDomain` mappers (only a few `as` casts at the query-builder boundary remain)           | `*/infrastructure/*_repository.ts`                                          |
| Domain imported other contexts' type files and framework file types          | Domain is framework-free; cross-context use limited to events + an anti-corruption adapter; enforced by a test            | `tests/unit/architecture.spec.ts`                                           |
| Six reference-data aggregates with full CQRS ceremony and no behaviour       | Not repeated: only aggregates with real rules (Product stock, Order lifecycle, User) get the full treatment               | —                                                                           |

## Honest trade-offs (worth discussing while studying)

- **Event handlers in the same transaction** keep stock and orders consistent, but couple Catalog's availability to Ordering's request. The alternative (outbox + async consumer) is eventually consistent and needs retries/idempotency.
- **Optimistic locking** turns contention into a `409 retry` instead of waiting. Under heavy load on one product, `SELECT ... FOR UPDATE` may be preferable.
- **A saved aggregate is single-use** inside a unit of work (its in-memory version is not bumped after `save`). Reload it if you must save again.
- **Read models are SQL against the same tables.** Still one database; a separate projection store would be the next step, not a prerequisite for CQRS.
- `GetMeHandler` reads through the repository on purpose, to show where a read model would be ceremony.
- Login is a command (it issues a token), so it runs in a transaction it does not strictly need.
