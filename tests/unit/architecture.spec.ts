import { test } from '@japa/runner'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(process.cwd(), 'src')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? files(full) : full.endsWith('.ts') ? [full] : []
  })
}

function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  return [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
}

const rel = (f: string) => f.replace(SRC + '/', '')

test.group('Architecture: dependency rules', () => {
  test('the scanner actually finds the code it polices', ({ assert }) => {
    assert.isAbove(files(SRC).filter((f) => f.includes('/domain/')).length, 10)
  })

  test('domain depends on nothing but other domain code', ({ assert }) => {
    const offenders: string[] = []
    for (const file of files(SRC).filter((f) => f.includes('/domain/'))) {
      for (const spec of importsOf(file)) {
        const bad =
          spec.includes('/application/') ||
          spec.includes('/infrastructure/') ||
          spec.startsWith('@adonisjs') ||
          spec.startsWith('luxon') ||
          (spec.startsWith('node:') && !spec.startsWith('node:crypto'))
        if (bad) offenders.push(`${rel(file)} -> ${spec}`)
      }
    }
    assert.deepEqual(offenders, [])
  })

  test('application never imports infrastructure or the web framework', ({ assert }) => {
    const offenders: string[] = []
    for (const file of files(SRC).filter((f) => f.includes('/application/'))) {
      for (const spec of importsOf(file)) {
        if (spec.includes('/infrastructure/') || spec.startsWith('@adonisjs/lucid')) {
          // the shared Bus/UoW ports are type-only; concrete infra is forbidden
          offenders.push(`${rel(file)} -> ${spec}`)
        }
      }
    }
    assert.deepEqual(offenders, [])
  })

  test('contexts only talk through events and ports, never aggregates', ({ assert }) => {
    const allowedCross = [
      // Catalog subscribes to Ordering's published events
      ['catalog/application/event_handlers/stock_event_handlers.ts', 'ordering/domain/events'],
      // Ordering's anti-corruption adapter is the single place that sees Catalog
      ['ordering/infrastructure/catalog_adapter.ts', 'catalog/domain/product_repository'],
    ]
    const offenders: string[] = []
    for (const file of files(SRC)) {
      const context = rel(file).split('/')[0]
      if (context === 'shared') continue
      for (const spec of importsOf(file)) {
        const m = spec.match(/^#(catalog|ordering|identity)\//)
        if (!m || m[1] === context) continue
        const ok = allowedCross.some(([f, target]) => rel(file) === f && spec.includes(target))
        if (!ok) offenders.push(`${rel(file)} -> ${spec}`)
      }
    }
    assert.deepEqual(offenders, [])
  })
})
