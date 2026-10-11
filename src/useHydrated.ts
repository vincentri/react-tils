import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * `false` on the server and during hydration, `true` once the component is
 * running in the browser.
 *
 * On a client-side mount after the page has hydrated, it is `true` from the
 * first render, so there is no flash. This replaces the
 * `useState(false)` + `useEffect(() => setMounted(true))` pattern, which
 * renders `false` first on every mount.
 *
 * Use when: rendering something that only makes sense in the browser, e.g. a
 * locale-formatted date or time, a client-only widget, or a "copy to
 * clipboard" button that needs browser APIs.
 * Don't use when: you need a specific browser value (viewport, storage,
 * network); use the hook for that value, which also renders the right thing
 * on the server. Don't use it to hide hydration mismatches you could fix.
 *
 * Other libraries call this `useIsClient`, `useMounted`.
 *
 * @example
 * const hydrated = useHydrated()
 * return <time>{hydrated ? date.toLocaleString() : date.toISOString()}</time>
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
