import { Query } from '#shared/application/message'
import type { Actor, Role } from '#shared/domain/actor'
import type { UserDto } from '#identity/application/ports'

export class GetMeQuery extends Query<UserDto> {
  static override readonly roles: readonly Role[] = ['customer', 'admin']
  constructor(readonly actor: Actor) {
    super()
  }
}
