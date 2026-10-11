import { useCallback, useSyncExternalStore } from 'react'
import { useLatest } from './internal/useLatest'

export type ScriptStatus = 'idle' | 'loading' | 'ready' | 'error'

export type ScriptOptions = {
  /** Load only while `true`, e.g. after consent or when a feature opens. Default `true`. */
  enabled?: boolean
  /** Extra attributes for the `<script>` tag, e.g. `{ nonce, crossorigin: 'anonymous' }`. Applied when it is created. */
  attributes?: Record<string, string>
}

type Entry = { status: ScriptStatus; listeners: Set<() => void> }

// One entry per src for the life of the page: a script runs once and cannot be unloaded.
const scripts = new Map<string, Entry>()

function load(src: string, attributes: Record<string, string> | undefined): Entry {
  const known = scripts.get(src)
  if (known) return known
  const entry: Entry = { status: 'loading', listeners: new Set() }
  scripts.set(src, entry)

  const url = new URL(src, location.href).href
  // ponytail: a matching <script> already in the page (e.g. from the server) is assumed loaded.
  if (Array.from(document.scripts).some((s) => s.src === url)) {
    entry.status = 'ready'
    return entry
  }

  const script = document.createElement('script')
  script.src = src
  script.async = true
  for (const [name, value] of Object.entries(attributes ?? {})) script.setAttribute(name, value)
  const settle = (status: ScriptStatus) => () => {
    entry.status = status
    script.removeEventListener('load', onLoad)
    script.removeEventListener('error', onError)
    entry.listeners.forEach((fn) => fn())
  }
  const onLoad = settle('ready')
  const onError = settle('error')
  script.addEventListener('load', onLoad)
  script.addEventListener('error', onError)
  document.head.append(script)
  return entry
}

/**
 * Loads an external script once and reports its status: `'idle'`,
 * `'loading'`, `'ready'`, or `'error'`.
 *
 * Every component using the same `src` shares one `<script>` tag and one
 * status. The tag is added on mount (never on the server) and is not removed
 * on unmount, because a script that has run cannot be unloaded. Status is
 * `'idle'` on the server, during hydration, and while disabled.
 *
 * Use when: a third-party SDK has no npm package or must load from its own
 * domain, e.g. Stripe.js, Google Maps, or a chat widget.
 * Don't use when: an npm package exists; import it, and use `import()` to load
 * it lazily. In Next.js, `next/script` also handles loading strategies. A
 * failed load stays `'error'` for that `src`; to retry, change the `src`.
 *
 * Other libraries call this `useExternal`.
 *
 * @param src - Script URL.
 * @param options - `enabled` and `attributes`. Optional.
 *
 * @example
 * const status = useScript('https://js.stripe.com/v3/', { attributes: { nonce } })
 * if (status === 'error') return <p>Payments are unavailable right now.</p>
 * if (status !== 'ready') return <Spinner />
 * return <Checkout stripe={window.Stripe(publishableKey)} />
 */
export function useScript(src: string, options: ScriptOptions = {}): ScriptStatus {
  const { enabled = true } = options
  // `attributes` only applies when the tag is first created, so changing it must not resubscribe.
  const attributesRef = useLatest(options.attributes)

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!enabled) return () => {}
      // Starting the load here, not during render, keeps render free of side effects.
      const entry = load(src, attributesRef.current)
      entry.listeners.add(onChange)
      return () => entry.listeners.delete(onChange)
    },
    [src, enabled, attributesRef],
  )

  return useSyncExternalStore(
    subscribe,
    () => (enabled ? (scripts.get(src)?.status ?? 'idle') : 'idle'),
    () => 'idle',
  )
}
