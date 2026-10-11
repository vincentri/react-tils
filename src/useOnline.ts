import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/**
 * Whether the browser has a network connection, and re-renders when it changes.
 *
 * Renders `serverValue` on the server and during hydration, then switches to
 * `navigator.onLine` with no hydration mismatch.
 *
 * Use when: showing an offline banner, disabling actions that need the network,
 * or queueing writes until the connection is back.
 * Don't use when: you need to know a server is reachable. `true` only means the
 * device has a network (it can still be a captive portal or a dead Wi-Fi), so
 * handle request failures anyway.
 *
 * Other libraries call this `useNetworkState`, `useNetwork`.
 *
 * @param serverValue - Value on the server and during hydration. Default `true`,
 * since most visitors are online.
 *
 * @example
 * const online = useOnline()
 * return online ? null : <Banner>You are offline. Changes will sync later.</Banner>
 */
export function useOnline(serverValue = true): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => serverValue,
  )
}
