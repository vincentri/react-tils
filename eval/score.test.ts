// Scores every eval/out/<condition>/<task>-<rep>.tsx with the same checks as hooks/testing.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { act, createElement, Fragment, type FunctionComponent, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterAll, beforeEach, expect, it } from 'vitest'
import { checkHydration, checkLeaks, checkServer } from '../src/internal/check'
import { resetEnvironment, tasks } from './tasks'

const outDir = new URL(process.env.EVAL_OUT ?? './out/', import.meta.url)
const solutions = existsSync(outDir)
  ? readdirSync(outDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .flatMap((condition) =>
        readdirSync(new URL(`${condition}/`, outDir))
          .filter((f) => f.endsWith('.tsx'))
          .map((file) => ({ condition, file, taskId: file.replace(/-\d+\.tsx$/, '') })),
      )
  : []

/**
 * Text after the first client commit, before passive effects run: what a
 * client-side navigation shows on its first frame. useEffect-based state
 * shows the default here and fixes it a frame later (a visible flash).
 */
async function firstFrame(Solution: FunctionComponent): Promise<string> {
  let seen = ''
  const container = document.createElement('div')
  const Probe = () => {
    useLayoutEffect(() => {
      seen = container.textContent ?? ''
    })
    return null
  }
  const root = createRoot(container)
  await act(async () =>
    root.render(createElement(Fragment, null, createElement(Solution), createElement(Probe))),
  )
  await act(async () => root.unmount())
  return seen
}

type Result = {
  condition: string
  file: string
  usedLibrary: boolean
  failures: string[]
  flashes: string[]
}
const results: Result[] = []

beforeEach(resetEnvironment)

it.each(solutions)('$condition/$file', async ({ condition, file, taskId }) => {
  const task = tasks.find((t) => t.id === taskId)
  expect(task, `unknown task ${taskId}`).toBeDefined()
  const url = new URL(`${condition}/${file}`, outDir)
  const source = readFileSync(url, 'utf8')
  const failures: string[] = []
  const flashes: string[] = []

  let Solution: FunctionComponent | undefined
  try {
    Solution = (await import(/* @vite-ignore */ url.pathname)).default
    if (typeof Solution !== 'function') failures.push('other: no default-exported component')
  } catch (error) {
    failures.push(`import failed: ${String(error).slice(0, 120)}`)
  }

  if (typeof Solution === 'function') {
    const server = checkServer(Solution)
    if (server) failures.push(server)
    for (const state of task!.states) {
      resetEnvironment()
      await state.setup?.(Solution)
      const { error, text } = await checkHydration(Solution)
      if (error) failures.push(`[${state.name}] ${error}`)
      else if (!text.includes(state.expect))
        failures.push(
          `[${state.name}] wrong output: expected "${state.expect}", got "${text.slice(0, 60)}"`,
        )
    }
    for (const state of task!.states) {
      resetEnvironment()
      await state.setup?.(Solution)
      try {
        const text = await firstFrame(Solution)
        if (!text.includes(state.expect))
          flashes.push(`[${state.name}] first frame "${text.slice(0, 40)}"`)
      } catch {
        // already reported by the hydration checks
      }
    }
    resetEnvironment()
    const leaks = await checkLeaks(Solution)
    if (leaks) failures.push(leaks)
  }

  results.push({
    condition,
    file,
    usedLibrary: /from ['"]react-tils(\/[\w]+)?['"]/.test(source),
    failures,
    flashes,
  })
})

const category = (failure: string) => {
  const f = failure.replace(/^\[[^\]]+\] /, '')
  return f.startsWith('server render')
    ? 'server crash'
    : f.includes('hydration')
      ? 'hydration mismatch'
      : f.startsWith('leaked')
        ? 'leak'
        : f.includes('wrong output')
          ? 'wrong output'
          : 'other'
}

afterAll(() => {
  if (results.length === 0) return
  results.sort((a, b) => (a.condition + a.file).localeCompare(b.condition + b.file))
  const conditions = [...new Set(results.map((r) => r.condition))]
  const kinds = ['server crash', 'hydration mismatch', 'leak', 'wrong output', 'other']
  const rows = conditions.map((c) => {
    const rs = results.filter((r) => r.condition === c)
    const count = (k: string) => rs.filter((r) => r.failures.some((f) => category(f) === k)).length
    const passed = rs.filter((r) => r.failures.length === 0).length
    const flashed = rs.filter((r) => r.flashes.length > 0).length
    return `| ${c} | ${passed}/${rs.length} | ${kinds.map(count).join(' | ')} | ${flashed} | ${rs.filter((r) => r.usedLibrary).length}/${rs.length} |`
  })
  const details = results.map(
    (r) =>
      `| ${r.condition} | ${r.file} | ${r.usedLibrary ? 'yes' : 'no'} | ${
        r.failures.length
          ? r.failures
              .map((f) => f.replace(/\s+/g, ' '))
              .join('<br>')
              .replaceAll('|', '\\|')
          : 'pass'
      } |`,
  )
  const md = [
    '| Condition | All checks pass | Server crash | Hydration mismatch | Leak | Wrong output | Other | Wrong first frame (client mount) | Used library |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
    '| Condition | Solution | Used library | Failures |',
    '| --- | --- | --- | --- |',
    ...details,
  ].join('\n')
  writeFileSync(new URL('RESULTS.md', outDir), md + '\n')
  writeFileSync(new URL('results.json', outDir), JSON.stringify(results, null, 2))
  console.log('\n' + md)
})
