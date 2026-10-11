// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Agents read the JSDoc in dist/*.d.ts. These rules keep it complete and the API predictable.
const dir = new URL('./', import.meta.url)
const entries = readdirSync(dir).filter(
  (f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'index.ts',
)
const hooks = entries.filter((f) => f.startsWith('use'))
const read = (file: string) => readFileSync(new URL(file, dir), 'utf8')

describe.each(entries)('%s', (file) => {
  const src = read(file)
  const exported = [...src.matchAll(/^export function (\w+)/gm)]

  it('exports at least one function', () => {
    expect(exported.length).toBeGreaterThan(0)
  })

  it.each(exported.map((m) => [m[1], m.index] as const))(
    '%s has JSDoc with a description and @example',
    (_, index) => {
      const before = src.slice(0, index).trimEnd()
      expect(before.endsWith('*/'), 'missing JSDoc').toBe(true)
      const doc = before.slice(before.lastIndexOf('/**'))
      expect(doc).toMatch(/^\/\*\*\s*\n\s*\* \S/) // description on the first line
      expect(doc).toContain('@example')
    },
  )
})

describe.each(hooks)('%s', (file) => {
  const name = file.slice(0, -3)

  it('file name = export name, exported from index', () => {
    expect(read(file)).toMatch(new RegExp(`^export function ${name}[<(]`, 'm'))
    expect(read('index.ts')).toContain(`export { ${name} } from './${name}'`)
  })

  it('JSDoc says when to use it and when not to', () => {
    expect(read(file)).toContain('Use when:')
    expect(read(file)).toContain("Don't use when:")
  })

  it('is listed in AGENTS.md', () => {
    expect(read('../AGENTS.md')).toContain(`\`${name}(`)
  })

  it('is linked from the README to its docs page', () => {
    expect(read('../README.md')).toContain(`/react-tils/hooks/${name}/)`)
  })

  it('has a test file that runs the hook or component matrix', () => {
    expect(read(`${name}.test.ts`)).toMatch(/(hookMatrix|componentMatrix)\(/)
  })

  it('has a size budget', () => {
    expect(read('../.size-limit.json')).toContain(`"dist/${name}.js"`)
  })
})
