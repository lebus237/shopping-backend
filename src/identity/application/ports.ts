import type { UserId } from '#shared/domain/ids'

export interface PasswordHasher {
  hash(plain: string): Promise<string>
  verify(hash: string, plain: string): Promise<boolean>
}

export interface TokenIssuer {
  /** Creates an opaque access token for the user and returns its secret. */
  issue(userId: UserId): Promise<string>
}

export interface UserDto {
  id: string
  email: string
  role: string
}
