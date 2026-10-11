// Step 2 of the Compare checks, in a browser-like environment (happy-dom, desktop-sized): hydrate
// the HTML each hook rendered on the real server (step 1), then mount and unmount it under
// StrictMode to find leaked listeners. Writes compare/results.json.
import { readFileSync, writeFileSync } from 'node:fs'
import { act, createElement, type FunctionComponent } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { checkLeaks } from '../src/internal/check'
import { CASES } from './cases'
import type { ServerResult } from './server.test'

export type Result = {
  server: 'ok' | 'throws' | 'warns'
  hydration: 'ok' | 'mismatch' | 'skipped'
  leaks: 'ok' | 'leaks'
  /** The first error or warning, for the page's details. */
  detail?: string
}

const server = JSON.parse(readFileSync('compare/server.json', 'utf8')) as Record<
  string,
  ServerResult
>

async function hydrate(html: string, Component: FunctionComponent): Promise<string | null> {
  const container = document.createElement('div')
  container.innerHTML = html
  const problems: string[] = []
  const error = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    problems.push(args.map(String).join(' '))
  })
  let root: ReturnType<typeof hydrateRoot> | undefined
  try {
    await act(async () => {
      root = hydrateRoot(container, createElement(Component), {
        onRecoverableError: (e) => problems.push(e instanceof Error ? e.message : String(e)),
      })
    })
  } finally {
    error.mockRestore()
  }
  await act(async () => root?.unmount())
  return problems[0] ?? null
}

const results: Record<string, Record<string, Result>> = {}

it.each(CASES)('$lib $hook ($task)', async ({ key, task, lib, Component }) => {
  // A plain client render first: if this fails, the call in cases.ts is wrong, not the library.
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Component)))
  await act(async () => root.unmount())
  localStorage.clear()

  const fromServer = server[key]
  expect(fromServer, `no server result for ${key}; run step 1 first`).toBeDefined()
  let hydration: Result['hydration'] = 'skipped'
  let detail = fromServer!.detail
  if (fromServer!.html !== undefined) {
    const problem = await hydrate(fromServer!.html, Component)
    hydration = problem ? 'mismatch' : 'ok'
    detail ??= problem ?? undefined
  }
  localStorage.clear()
  const leaked = await checkLeaks(Component)
  detail ??= leaked ?? undefined
  ;(results[task] ??= {})[lib] = {
    server: fromServer!.server,
    hydration,
    leaks: leaked ? 'leaks' : 'ok',
    ...(detail && { detail: detail.split('\n')[0]!.slice(0, 160) }),
  }
})

it('writes the results', () => {
  expect(Object.keys(results)).not.toHaveLength(0)
  writeFileSync('compare/results.json', `${JSON.stringify(results, null, 2)}\n`)
})
