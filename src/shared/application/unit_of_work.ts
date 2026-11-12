/**
 * Port: run a use case atomically. Everything the work does through
 * repositories either commits together or not at all, and domain events
 * raised along the way are dispatched in the right phase.
 */
export interface UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>
}
