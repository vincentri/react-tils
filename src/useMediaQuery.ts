import { useCallback, useSyncExternalStore } from 'react'

/**
 * Tracks whether a CSS media query matches, and re-renders when it changes.
 *
 * Renders `serverValue` on the server and during hydration, then switches to the
 * real value with no hydration mismatch. Concurrent-safe: every component reads
 * the same value in one render.
 *
 * Use when: JS logic depends on viewport size, `prefers-color-scheme`,
 * `prefers-reduced-motion`, pointer type, or orientation.
 * Don't use when: only styling changes. Use a CSS `@media` rule instead, which
 * needs no JS and never flashes.
 *
 * Other libraries call this `useMedia`, `useBreakpoint`, `useResponsive`.
 *
 * @param query - Any CSS media query, e.g. `'(min-width: 768px)'`.
 * @param serverValue - Value on the server and during hydration. Pick the value
 * most visitors will have, to minimize the switch after hydration. Default `false`.
 *
 * @example
 * const isWide = useMediaQuery('(min-width: 768px)')
 * const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
 * // Mobile-first site: assume narrow on the server.
 * const isDesktop = useMediaQuery('(min-width: 1024px)', false)
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )
  // ponytail: one MediaQueryList per subscriber; share per query if many components use the same query.
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  )
}
