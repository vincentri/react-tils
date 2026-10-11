import { useEffect } from 'react'

function onBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault()
  // Chrome before 119 needs returnValue set; the text is ignored by every browser.
  event.returnValue = ''
}

/**
 * Asks the browser to confirm before the user closes the tab, reloads, or
 * navigates to another site, while `when` is `true`.
 *
 * Browsers show their own generic message; custom text is not possible. The
 * listener is only added while `when` is `true`, because an active
 * `beforeunload` listener can stop the browser from caching the page for
 * instant back/forward.
 *
 * Use when: a form or editor has unsaved changes.
 * Don't use when: you need to save data on exit; use `pagehide` or
 * `visibilitychange` with `navigator.sendBeacon`. This does not catch
 * client-side navigation (Next.js `<Link>`, router pushes); block those in
 * your router.
 *
 * @param when - Ask for confirmation while `true`. Default `true`.
 *
 * @example
 * const [draft, setDraft] = useState('')
 * useBeforeUnload(draft !== savedDraft)
 */
export function useBeforeUnload(when = true): void {
  useEffect(() => {
    if (!when) return
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [when])
}
