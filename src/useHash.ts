import { useCallback, useSyncExternalStore } from 'react'

// The Navigation API also reports history.pushState, which routers (Next.js included) use for
// hash links and which fires no hashchange. Browsers without it still get hashchange.
const navigation = () => (window as { navigation?: EventTarget }).navigation

function subscribe(onChange: () => void) {
  const nav = navigation()
  window.addEventListener('hashchange', onChange)
  nav?.addEventListener('currententrychange', onChange)
  return () => {
    window.removeEventListener('hashchange', onChange)
    nav?.removeEventListener('currententrychange', onChange)
  }
}

/**
 * The URL hash, like `location.hash` (`'#pricing'`, or `''` when there is
 * none), and a setter. Re-renders on hash links, back/forward, `setHash`, and
 * router navigation that uses `history.pushState` (e.g. Next.js `<Link
 * href="#pricing">`, in browsers with the Navigation API).
 *
 * The server never sees the hash, so the server render and hydration use
 * `serverValue`, then the real hash with no hydration mismatch.
 *
 * Use when: tabs or an open panel that should survive reload and be linkable
 * (`/settings#billing`), or highlighting the section a link pointed to.
 * Don't use when: the state must reach the server or appear in search
 * results; use a query param (`useSearchParam`, or your router's). To style the target
 * element, use CSS `:target`.
 *
 * @param serverValue - Value on the server and during hydration. Default `''`.
 * @returns `[hash, setHash]`. `setHash('#billing')` (or `'billing'`) adds a
 * history entry and scrolls to a matching `id`, like clicking a hash link.
 *
 * @example
 * const [hash, setHash] = useHash()
 * const tab = hash === '#billing' ? 'billing' : 'profile'
 * return <button onClick={() => setHash('#billing')}>Billing</button>
 */
export function useHash(serverValue = ''): [string, (hash: string) => void] {
  const hash = useSyncExternalStore(
    subscribe,
    () => location.hash,
    () => serverValue,
  )
  const setHash = useCallback((next: string) => {
    location.hash = next
  }, [])
  return [hash, setHash]
}
