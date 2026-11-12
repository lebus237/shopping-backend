import type { LucidUnitOfWork } from '#shared/infrastructure/lucid_unit_of_work'
import type { Role } from '#shared/domain/actor'
import type { UserId } from '#shared/domain/ids'
import { User } from '#identity/domain/user'
import type { UserRepository } from '#identity/domain/user_repository'
import { UserAlreadyExistsError } from '#identity/domain/errors/identity_errors'

interface UserRow {
  id: string
  email: string
  password_hash: string
  role: Role
  version: number
}

export class LucidUserRepository implements UserRepository {
  constructor(private readonly uow: LucidUnitOfWork) {}

  async save(user: User): Promise<void> {
    const s = user.toSnapshot()
    try {
      await this.uow.client.table('users').insert({
        id: s.id,
        email: s.email,
        password_hash: s.passwordHash,
        role: s.role,
        version: 1,
      })
    } catch (error) {
      // 23505 = unique_violation: two sign-ups raced past the findByEmail check.
      if ((error as { code?: string }).code === '23505') throw new UserAlreadyExistsError()
      throw error
    }
    this.uow.collect(user.pullEvents())
  }

  async findById(id: UserId): Promise<User | null> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null
    const row = (await this.uow.client.from('users').where('id', id).first()) as UserRow | null
    return row ? toDomain(row) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = (await this.uow.client
      .from('users')
      .where('email', email)
      .first()) as UserRow | null
    return row ? toDomain(row) : null
  }
}

function toDomain(row: UserRow): User {
  return User.reconstitute({
    id: row.id as UserId,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    version: row.version,
  })
}
