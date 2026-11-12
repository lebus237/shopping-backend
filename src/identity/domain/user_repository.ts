import type { UserId } from '#shared/domain/ids'
import type { User } from '#identity/domain/user'

export interface UserRepository {
  save(user: User): Promise<void>
  findById(id: UserId): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
}
