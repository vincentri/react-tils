import { useCallback, useSyncExternalStore } from 'react'

// pushState and replaceState fire no event. Writes through this hook notify directly; Back and
// Forward fire popstate; the Navigation API also reports a router's own pushState calls.
const listeners = new Set<() => void>()
const navigation = () => (window as { navigation?: EventTarget }).navigation

function subscribe(onChange: () => void) {
  const nav = navigation()
  listeners.add(onChange)
  window.addEventListener('popstate', onChange)
  nav?.addEventListener('currententrychange', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('popstate', onChange)
    nav?.removeEventListener('currententrychange', onChange)
  }
}

/**
 * One URL query parameter (`?tab=billing`) as state: its value, or `null`
 * when it's missing, and a setter that updates the URL without reloading.
 * Works with or without a router: re-renders on `set` (in any component),
 * Back and Forward, and router navigation that uses `history.pushState` (in
 * browsers with the Navigation API).
 *
 * The server render and hydration use `serverValue`, then the real URL with
 * no hydration mismatch. Pass the request's value (e.g. from `searchParams`
 * in a Next.js page) so the first frame is already right.
 *
 * Works with Next.js's App Router: after `set`, Next's own `useSearchParams`
 * updates too, and no server request is made.
 *
 * Use when: state that should be linkable, bookmarkable, and survive reload:
 * the selected tab, a search query, filters, sorting, a page number, an open
 * item's id.
 * Don't use when: your router already gives you this (React Router's
 * `useSearchParams`); for state that shouldn't reach the server, use `useHash`;
 * for private or large state, use `useLocalStorage`. Values are strings: parse
 * numbers and validate, since anyone can edit the URL.
 *
 * Other libraries call this `useQueryState` (nuqs), `useSearchParam` (react-use), `useUrlState`.
 *
 * @param name - The parameter name.
 * @param serverValue - The value on the server and during hydration. Default `null`.
 * @returns `[value, set]`. `set(value)` replaces the current history entry;
 * `set(value, { push: true })` adds one, so Back undoes it. `set(null)` removes the parameter.
 *
 * @example
 * const [query, setQuery] = useSearchParam('q')
 * return <input value={query ?? ''} onChange={(e) => setQuery(e.target.value || null)} />
 *
 * // Tabs where Back returns to the previous tab
 * const [tab, setTab] = useSearchParam('tab')
 * return <button onClick={() => setTab('billing', { push: true })}>Billing</button>
 */
export function useSearchParam(
  name: string,
  serverValue: string | null = null,
): [string | null, (value: string | null, options?: { push?: boolean }) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(location.search).get(name),
    () => serverValue,
  )
  const set = useCallback(
    (next: string | null, options: { push?: boolean } = {}) => {
      const url = new URL(location.href)
      if (next === null) url.searchParams.delete(name)
      else url.searchParams.set(name, next)
      if (url.href === location.href) return
      // A new entry starts empty. A replaced one keeps its state (a router's own) minus Next.js's
      // markers for its own navigations: Next skips calls carrying them, and with them gone it
      // syncs its router and restores its internals itself.
      // oxlint-disable-next-line no-unused-vars
      const { __NA, _N, __N, ...state } = (history.state ?? {}) as Record<string, unknown>
      if (options.push) history.pushState(null, '', url)
      else history.replaceState(state, '', url)
      listeners.forEach((fn) => fn())
    },
    [name],
  )
  return [value, set]
}
