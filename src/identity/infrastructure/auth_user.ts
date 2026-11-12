import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'

/**
 * Lucid model used ONLY by the Adonis auth guard (to resolve a bearer token to
 * a user) and by the token issuer. All business access to users goes through
 * the `User` aggregate and `UserRepository`, never through this class.
 */
export default class AuthUser extends BaseModel {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare email: string

  @column()
  declare role: 'customer' | 'admin'

  @column.dateTime({ columnName: 'created_at' })
  declare createdAt: DateTime

  static accessTokens = DbAccessTokensProvider.forModel(AuthUser, {
    expiresIn: '7 days',
    prefix: 'oat_',
    table: 'auth_access_tokens',
    type: 'auth_token',
    tokenSecretLength: 40,
  })
}
