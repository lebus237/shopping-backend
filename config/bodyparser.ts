import { defineConfig } from '@adonisjs/core/bodyparser'

// JSON API only: no multipart uploads, small body limit.
const bodyParserConfig = defineConfig({
  allowedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  form: { convertEmptyStringsToNull: true, types: ['application/x-www-form-urlencoded'] },
  json: { convertEmptyStringsToNull: true, limit: '100kb', types: ['application/json'] },
  multipart: { autoProcess: false, types: ['multipart/form-data'] },
})

export default bodyParserConfig
