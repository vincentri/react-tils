// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const bin = new URL('./react-tils.js', import.meta.url).pathname
const LINE =
  'For React code that reads browser state, read node_modules/react-tils/AGENTS.md first.'

let dir: string
const run = (...args: string[]) =>
  execFileSync('node', [bin, ...args], { cwd: dir, encoding: 'utf8' })
const read = (file: string) => readFileSync(join(dir, file), 'utf8')
const fresh = () => (dir = mkdtempSync(join(tmpdir(), 'react-tils-init-')))

afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('npx react-tils init', () => {
  it('creates CLAUDE.md and AGENTS.md when neither exists', () => {
    fresh()
    expect(run('init')).toBe('CLAUDE.md: created\nAGENTS.md: created\n')
    expect(read('CLAUDE.md')).toBe(`${LINE}\n`)
    expect(read('AGENTS.md')).toBe(`${LINE}\n`)
  })

  it('appends to existing files only, once, and adds a Cursor rule when .cursor exists', () => {
    fresh()
    writeFileSync(join(dir, 'CLAUDE.md'), '# Project\nUse pnpm.')
    mkdirSync(join(dir, '.cursor'))
    run('init')
    expect(read('CLAUDE.md')).toBe(`# Project\nUse pnpm.\n\n${LINE}\n`)
    expect(read('.cursor/rules/react-tils.mdc')).toContain(LINE)
    expect(() => read('AGENTS.md')).toThrow(/ENOENT/)

    expect(run('init')).toContain('CLAUDE.md: already set up')
    expect(read('CLAUDE.md').split(LINE)).toHaveLength(2)
  })

  it('works through a symlink, like npx', () => {
    fresh()
    mkdirSync(join(dir, 'node_modules/.bin'), { recursive: true })
    symlinkSync(bin, join(dir, 'node_modules/.bin/react-tils'))
    execFileSync('node', [join(dir, 'node_modules/.bin/react-tils'), 'init'], { cwd: dir })
    expect(read('CLAUDE.md')).toBe(`${LINE}\n`)
  })

  it('prints usage and fails for unknown commands', () => {
    fresh()
    expect(() => run('nope')).toThrow(/Command failed/)
    expect(run()).toContain('Usage: npx react-tils init')
  })
})
