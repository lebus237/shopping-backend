import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const isTest = env.get('NODE_ENV') === 'test'

// Test defaults match docker-compose.test.yml; other environments must configure DB_*.
const dbConfig = defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST', isTest ? '127.0.0.1' : 'localhost'),
        port: env.get('DB_PORT', isTest ? 5433 : 5432),
        user: env.get('DB_USER', isTest ? 'postgres' : 'postgres'),
        password: env.get('DB_PASSWORD', isTest ? 'postgres' : ''),
        database: env.get('DB_DATABASE', isTest ? 'shopping_test' : 'shopping'),
      },
      migrations: { naturalSort: true, paths: ['database/migrations'] },
    },
  },
})

export default dbConfig
