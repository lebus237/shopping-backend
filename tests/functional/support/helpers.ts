import db from '@adonisjs/lucid/services/db'
import type { ApiClient } from '@japa/api-client'

export const PASSWORD = 'Password123'

export async function resetDatabase() {
  await db.rawQuery(
    'TRUNCATE audit_log, order_lines, orders, products, auth_access_tokens, users RESTART IDENTITY CASCADE'
  )
}

let counter = 0
export const uniqueEmail = (prefix = 'user') => `${prefix}-${Date.now()}-${++counter}@example.com`

/** Registers a user through the real API and returns a bearer token. */
export async function signUp(
  client: ApiClient,
  opts: { email?: string; admin?: boolean } = {}
): Promise<{ token: string; id: string; email: string }> {
  const email = opts.email ?? uniqueEmail()
  const registered = await client.post('/api/auth/register').json({ email, password: PASSWORD })
  registered.assertStatus(201)
  const id = registered.body().id as string

  // Admins cannot self-register; promote directly in the DB, like a real operator would.
  if (opts.admin) await db.from('users').where('id', id).update({ role: 'admin' })

  const login = await client.post('/api/auth/login').json({ email, password: PASSWORD })
  login.assertStatus(200)
  return { token: login.body().token as string, id, email }
}

export async function createProduct(
  client: ApiClient,
  adminToken: string,
  overrides: Partial<{ sku: string; name: string; priceCents: number; stock: number }> = {}
): Promise<string> {
  const res = await client
    .post('/api/admin/products')
    .bearerToken(adminToken)
    .json({
      sku: overrides.sku ?? `SKU-${Date.now()}-${++counter}`,
      name: overrides.name ?? 'Test product',
      priceCents: overrides.priceCents ?? 1000,
      stock: overrides.stock ?? 10,
    })
  res.assertStatus(201)
  return res.body().id as string
}

export async function stockOf(productId: string): Promise<number> {
  const row = await db.from('products').where('id', productId).firstOrFail()
  return row.stock as number
}
