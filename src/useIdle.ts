import { useEffect, useState } from 'react'

const ACTIVITY = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const

/**
 * Whether the user has been inactive (no pointer, keyboard, touch, wheel, or
 * scroll input) for `timeoutMs`. Becomes `false` again on the next activity.
 *
 * `false` on the server, during hydration, and on mount: a user who just
 * loaded the page counts as active. Activity only records a timestamp, and a
 * single timer checks it, so mouse movement does not re-render.
 *
 * Use when: showing "Are you still there?" before a session timeout, pausing
 * expensive live updates, or setting a chat status to "away".
 * Don't use when: you mean "the tab is hidden"; use `useDocumentVisibility`.
 * Activity inside an `<iframe>` (an embedded video or payment form) isn't
 * seen, so a user busy there can turn idle.
 * Don't use it alone to log users out for security; enforce session expiry on
 * the server.
 *
 * @param timeoutMs - Milliseconds without activity before idle. Default `60_000`.
 *
 * @example
 * const idle = useIdle(5 * 60_000)
 * return idle ? <Dialog>Are you still there?</Dialog> : null
 */
export function useIdle(timeoutMs = 60_000): boolean {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    let lastActive = Date.now()
    let isIdle = false
    let timer: ReturnType<typeof setTimeout>

    const check = () => {
      const remaining = lastActive + timeoutMs - Date.now()
      if (remaining > 0) {
        timer = setTimeout(check, remaining)
        return
      }
      isIdle = true
      setIdle(true)
    }
    const onActivity = () => {
      lastActive = Date.now()
      if (!isIdle) return
      isIdle = false
      setIdle(false)
      timer = setTimeout(check, timeoutMs) // the timer stops while idle; restart it
    }

    timer = setTimeout(check, timeoutMs)
    for (const type of ACTIVITY) window.addEventListener(type, onActivity, { passive: true })
    return () => {
      clearTimeout(timer)
      for (const type of ACTIVITY) window.removeEventListener(type, onActivity)
    }
  }, [timeoutMs])

  return idle
}
