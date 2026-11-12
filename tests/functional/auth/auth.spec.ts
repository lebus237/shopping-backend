import { test } from '@japa/runner'
import { PASSWORD, resetDatabase, signUp, uniqueEmail } from '../support/helpers.js'

test.group('Auth', (group) => {
  group.each.setup(resetDatabase)

  test('register, login, me', async ({ client, assert }) => {
    const { token, email } = await signUp(client)
    const me = await client.get('/api/auth/me').bearerToken(token)
    me.assertStatus(200)
    assert.equal(me.body().email, email)
    assert.equal(me.body().role, 'customer')
  })

  test('duplicate email -> 409, bad credentials -> 401, weak password -> 422', async ({
    client,
  }) => {
    const email = uniqueEmail()
    await client.post('/api/auth/register').json({ email, password: PASSWORD })
    const dup = await client
      .post('/api/auth/register')
      .json({ email: email.toUpperCase(), password: PASSWORD })
    dup.assertStatus(409)

    const bad = await client.post('/api/auth/login').json({ email, password: 'wrong-password' })
    bad.assertStatus(401)

    const weak = await client
      .post('/api/auth/register')
      .json({ email: uniqueEmail(), password: 'short' })
    weak.assertStatus(422)
  })

  test('me requires a token', async ({ client }) => {
    ;(await client.get('/api/auth/me')).assertStatus(401)
  })
})
