import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('focus', onChange)
  window.addEventListener('blur', onChange)
  return () => {
    window.removeEventListener('focus', onChange)
    window.removeEventListener('blur', onChange)
  }
}

/**
 * Whether the browser window has focus, updated on focus and blur.
 *
 * Renders `serverValue` on the server and during hydration, then switches to
 * `document.hasFocus()` with no hydration mismatch.
 *
 * Use when: the page is visible but the user is in another window, e.g. pause
 * a game, mark messages as read only while focused, or refetch on return.
 * Don't use when: you mean "the tab is hidden"; use `useDocumentVisibility`
 * (a visible page can be unfocused, e.g. side by side with another window).
 * For focus inside the page (which input is active), use `focus`/`blur`
 * handlers or CSS `:focus-within`.
 *
 * @param serverValue - Value on the server and during hydration. Default `true`.
 *
 * @example
 * const focused = useWindowFocus()
 * useEffect(() => {
 *   if (focused) markAsRead(conversationId)
 * }, [focused, conversationId])
 */
export function useWindowFocus(serverValue = true): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.hasFocus(),
    () => serverValue,
  )
}
