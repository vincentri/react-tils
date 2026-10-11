import { useEffect } from 'react'
import { useLatest } from './internal/useLatest'

/**
 * Calls `callback` when the browser restores the page from its back/forward
 * cache, e.g. the user comes back with the Back button. The page reappears
 * exactly as it was left: no reload, no new render, no effects re-run, so
 * data shown on it may be stale.
 *
 * Always calls the latest `callback`. Nothing runs on the server or on a
 * normal page load.
 *
 * Use when: refreshing a cart, notifications, prices, or anything else that
 * may have changed while the user was on another page, or resetting UI such
 * as an open menu or a "Submitting…" button left over from before.
 * Don't use when: you want to know when the tab becomes visible again; use
 * `useDocumentVisibility`. Avoid `unload` listeners anywhere on the page:
 * they stop browsers from caching it at all.
 *
 * Other libraries call this `useBfcache`, `usePageShow`.
 *
 * @param callback - Called with the `pageshow` event. Can change every render.
 *
 * @example
 * const { data, refetch } = useCart() // your data-fetching hook
 * usePageRestore(() => refetch())
 *
 * // Reset a form that was left mid-submit before navigating away.
 * usePageRestore(() => setSubmitting(false))
 */
export function usePageRestore(callback: (event: PageTransitionEvent) => void): void {
  const callbackRef = useLatest(callback)
  useEffect(() => {
    const listener = (event: PageTransitionEvent) => {
      if (event.persisted) callbackRef.current(event)
    }
    window.addEventListener('pageshow', listener)
    return () => window.removeEventListener('pageshow', listener)
  }, [callbackRef])
}
