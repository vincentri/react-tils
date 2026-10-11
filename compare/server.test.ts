// @vitest-environment node
// Step 1 of the Compare checks: render each hook the way a real Node server does, with no DOM at
// all (not even at import time, which a simulated server can't undo). Writes compare/server.json.
import { writeFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { CASES } from './cases'

export type ServerResult = { server: 'ok' | 'throws' | 'warns'; html?: string; detail?: string }

it('server-renders every case in plain Node', () => {
  expect(typeof window).toBe('undefined')
  const results: Record<string, ServerResult> = {}
  for (const { key, Component } of CASES) {
    const logged: string[] = []
    const log = (...args: unknown[]) => logged.push(args.map(String).join(' '))
    const warn = vi.spyOn(console, 'warn').mockImplementation(log)
    const error = vi.spyOn(console, 'error').mockImplementation(log)
    try {
      const html = renderToString(createElement(Component))
      results[key] =
        logged.length > 0 ? { server: 'warns', html, detail: logged[0] } : { server: 'ok', html }
    } catch (thrown) {
      results[key] = {
        server: 'throws',
        detail: thrown instanceof Error ? thrown.message : String(thrown),
      }
    } finally {
      warn.mockRestore()
      error.mockRestore()
    }
  }
  // Run from the repository root (pnpm compare).
  writeFileSync('compare/server.json', `${JSON.stringify(results, null, 2)}\n`)
})
