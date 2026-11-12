import type { UserId } from '#shared/domain/ids'

export type Role = 'customer' | 'admin'

/** Who is performing a command or query. Passed explicitly, never ambient. */
export interface Actor {
  readonly userId: UserId
  readonly role: Role
}

export function isAdmin(actor: Actor | null): boolean {
  return actor?.role === 'admin'
}
