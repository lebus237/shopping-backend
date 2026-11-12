import type { UserId } from '#shared/domain/ids'
import type { TokenIssuer } from '#identity/application/ports'
import AuthUser from '#identity/infrastructure/auth_user'

export class AccessTokenIssuer implements TokenIssuer {
  async issue(userId: UserId): Promise<string> {
    const user = await AuthUser.findOrFail(userId)
    const token = await AuthUser.accessTokens.create(user)
    return token.value!.release()
  }
}
