import { act, createElement, type FunctionComponent, StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { vi } from 'vitest'

// Each check returns null on success, or a short reason on failure.
// Shared by `@vincent.ri/react-tils/testing` and the eval scorer.

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

/** Render like a real server: no `window`, no `document`. */
export function serverRender(Component: FunctionComponent): string {
  vi.stubGlobal('window', undefined)
  vi.stubGlobal('document', undefined)
  try {
    return renderToString(createElement(Component))
  } finally {
    vi.unstubAllGlobals()
  }
}

export function checkServer(Component: FunctionComponent): string | null {
  try {
    serverRender(Component)
    return null
  } catch (error) {
    return `server render threw: ${message(error)}`
  }
}

/** Hydrates server HTML on the client. Returns the failure and the text after effects. */
export async function checkHydration(
  Component: FunctionComponent,
): Promise<{ error: string | null; text: string }> {
  let html: string
  try {
    html = serverRender(Component)
  } catch (error) {
    return { error: `server render threw: ${message(error)}`, text: '' }
  }
  const container = document.createElement('div')
  container.innerHTML = html
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  const recoverable: unknown[] = []
  let root: ReturnType<typeof hydrateRoot> | undefined
  try {
    await act(async () => {
      root = hydrateRoot(container, createElement(Component), {
        onRecoverableError: (error) => recoverable.push(error),
      })
    })
  } catch (error) {
    return { error: `hydration threw: ${message(error)}`, text: '' }
  } finally {
    consoleError.mockRestore()
  }
  const problems = [
    ...recoverable.map((e) => message(e)),
    ...consoleError.mock.calls.map((args) => args.map(String).join(' ')),
  ]
  const error = problems.length > 0 ? `hydration: ${problems[0]!.slice(0, 200)}` : null
  const text = container.textContent ?? ''
  // Unmount so effects (listeners, locks, timers) don't leak into later checks.
  await act(async () => root?.unmount())
  return { error, text }
}

/**
 * Spy on every addEventListener/removeEventListener in the DOM. In happy-dom,
 * `window` does not inherit from the global `EventTarget`, so collect each
 * distinct prototype that owns the methods.
 */
function spyListeners() {
  const owners = new Set<object>()
  for (const target of [window, document, new EventTarget()]) {
    let proto: object | null = target
    while (proto && !Object.hasOwn(proto, 'addEventListener')) proto = Object.getPrototypeOf(proto)
    if (proto) owners.add(proto)
  }
  const adds = [...owners].map((o) => vi.spyOn(o as EventTarget, 'addEventListener'))
  const removes = [...owners].map((o) => vi.spyOn(o as EventTarget, 'removeEventListener'))
  const calls = (spies: typeof adds) =>
    spies.flatMap((s) =>
      s.mock.calls.map((args, i) => ({ target: s.mock.contexts[i], type: args[0], fn: args[1] })),
    )
  return {
    added: () => calls(adds),
    removed: () => calls(removes),
    restore: () => [...adds, ...removes].forEach((s) => s.mockRestore()),
  }
}

export async function checkLeaks(Component: FunctionComponent): Promise<string | null> {
  const spy = spyListeners()
  try {
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(StrictMode, null, createElement(Component))))
    await act(async () => root.unmount())

    // React's own delegated listeners live on the container; ignore them.
    const live = spy.added().filter((l) => l.target !== container)
    for (const r of spy.removed()) {
      const at = live.findIndex((l) => l.target === r.target && l.type === r.type && l.fn === r.fn)
      if (at !== -1) live.splice(at, 1)
    }
    return live.length > 0 ? `leaked listeners: ${live.map((l) => l.type).join(', ')}` : null
  } catch (error) {
    return `client render threw: ${message(error)}`
  } finally {
    spy.restore()
  }
}
