import vine from '@vinejs/vine'

export const credentialsSchema = vine.compile(
  vine.object({
    email: vine.string().trim().email().maxLength(254),
    password: vine.string().minLength(8).maxLength(128),
  })
)

export const createProductSchema = vine.compile(
  vine.object({
    sku: vine.string().trim().minLength(1).maxLength(64),
    name: vine.string().trim().minLength(1).maxLength(200),
    priceCents: vine.number().withoutDecimals().positive().max(100_000_000),
    stock: vine.number().withoutDecimals().min(0).max(1_000_000),
  })
)

export const restockSchema = vine.compile(
  vine.object({ quantity: vine.number().withoutDecimals().positive().max(1_000_000) })
)

export const setActiveSchema = vine.compile(vine.object({ active: vine.boolean() }))

export const placeOrderSchema = vine.compile(
  vine.object({
    items: vine
      .array(
        vine.object({
          productId: vine.string().uuid(),
          quantity: vine.number().withoutDecimals().positive().max(1000),
        })
      )
      .minLength(1)
      .maxLength(50),
  })
)
