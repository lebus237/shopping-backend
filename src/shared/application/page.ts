export interface Page<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface PageRequest {
  page: number
  limit: number
}

export function normalizePage(page?: number, limit?: number): PageRequest {
  return {
    page: Math.max(1, Math.trunc(page ?? 1)),
    limit: Math.min(100, Math.max(1, Math.trunc(limit ?? 20))),
  }
}
