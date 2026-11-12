import { configApp } from '@adonisjs/eslint-config'

export default configApp({
  rules: {
    // `(await x.json()).assertStatus(201)` reads fine in API tests and handlers
    '@unicorn/no-await-expression-member': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
    ],
  },
})
