import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

/**
 * The page's `document.visibilityState` (`'visible'` or `'hidden'`), updated
 * when the user switches tabs, minimizes the window, or locks the screen.
 *
 * Renders `serverValue` on the server and during hydration, then switches to the
 * real state with no hydration mismatch.
 *
 * Use when: pausing polling, video, animations, or timers while the page is
 * hidden, or refreshing data when the user comes back.
 * Don't use when: you need to know if an element is on screen; use an
 * IntersectionObserver. Don't use it to save state before the page closes;
 * listen for `pagehide` instead, since a hidden page may never become visible.
 *
 * Other libraries call this `usePageVisibility`.
 *
 * @param serverValue - State on the server and during hydration. Default `'visible'`.
 *
 * @example
 * const visibility = useDocumentVisibility()
 * useEffect(() => {
 *   if (visibility === 'hidden') return
 *   const id = setInterval(refresh, 5000)
 *   return () => clearInterval(id)
 * }, [visibility])
 */
export function useDocumentVisibility(
  serverValue: DocumentVisibilityState = 'visible',
): DocumentVisibilityState {
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState,
    () => serverValue,
  )
}
