import { createElement, type FunctionComponent } from 'react'
import { expect, it } from 'vitest'
import { checkHydration, checkLeaks, checkServer } from './internal/check'

/**
 * Registers vitest tests that prove a component is safe to ship: it renders on
 * the server without DOM globals, hydrates with no mismatch, and removes every
 * listener it adds after a StrictMode mount/unmount.
 *
 * Use it on components that read browser state (viewport, storage, network,
 * visibility). For a single hook, `hookMatrix` is shorter. Call inside a
 * `describe` in a test file running in a DOM environment (happy-dom or jsdom).
 * Requires `vitest` and `react-dom`.
 *
 * @example
 * // Sidebar.test.tsx
 * import { describe } from 'vitest'
 * import { componentMatrix } from '@vincent.ri/react-tils/testing'
 * import { Sidebar } from './Sidebar'
 *
 * describe('Sidebar', () => {
 *   componentMatrix(Sidebar)
 * })
 */
export function componentMatrix(Component: FunctionComponent): void {
  it('renders on the server without DOM globals', () => {
    expect(checkServer(Component)).toBeNull()
  })

  it('hydrates without mismatch', async () => {
    expect((await checkHydration(Component)).error).toBeNull()
  })

  it('removes every listener it adds (StrictMode mount + unmount)', async () => {
    expect(await checkLeaks(Component)).toBeNull()
  })
}

/**
 * Registers vitest tests that prove a hook is safe to ship: it renders on the
 * server without DOM globals, hydrates with no mismatch, and removes every
 * listener it adds after a StrictMode mount/unmount.
 *
 * Use it on every custom hook you write, especially hooks that read browser
 * state. Call inside a `describe` in a test file running in a DOM environment
 * (happy-dom or jsdom). Requires `vitest` and `react-dom`.
 *
 * @example
 * // useScrollY.test.ts
 * import { describe } from 'vitest'
 * import { hookMatrix } from '@vincent.ri/react-tils/testing'
 * import { useScrollY } from './useScrollY'
 *
 * describe('useScrollY', () => {
 *   hookMatrix(() => useScrollY())
 * })
 */
export function hookMatrix(useHook: () => unknown): void {
  componentMatrix(() => createElement('span', null, String(JSON.stringify(useHook()))))
}
