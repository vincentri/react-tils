import { useEffect } from 'react'
import { useLatest } from './internal/useLatest'
import { useDocumentVisibility } from './useDocumentVisibility'

export type IntervalOptions = {
  /** Pause while the tab is hidden, and resume when it is visible again. Default `false`. */
  pauseWhenHidden?: boolean
}

/**
 * Calls `callback` every `delayMs` milliseconds. Pass `null` as the delay to
 * pause. Always calls the latest `callback`, so it can read current state
 * without restarting the timer.
 *
 * The timer restarts only when `delayMs` changes or it is paused and resumed.
 * Browsers slow timers in background tabs (to once a second or less), so
 * don't count ticks to measure time; compare `Date.now()` or use `useNow`.
 * Cleared on unmount. Nothing runs on the server.
 *
 * Use when: polling an API, a countdown or clock, or rotating a carousel.
 * Don't use when: you need a single delay; use `setTimeout` in an event
 * handler or effect. For animation, use CSS or `requestAnimationFrame`.
 * Server data that changes often may suit a data-fetching library with
 * built-in refetching.
 *
 * @param callback - Called on every tick. Can change every render.
 * @param delayMs - Milliseconds between ticks, or `null` to pause.
 * @param options - `pauseWhenHidden`. Optional.
 *
 * @example
 * const [count, setCount] = useState(0)
 * useInterval(() => setCount(count + 1), running ? 1000 : null)
 *
 * // Poll every 5s, but not while the tab is in the background.
 * useInterval(refresh, 5000, { pauseWhenHidden: true })
 */
export function useInterval(
  callback: () => void,
  delayMs: number | null,
  options: IntervalOptions = {},
): void {
  const { pauseWhenHidden = false } = options
  const callbackRef = useLatest(callback)
  const hidden = useDocumentVisibility() === 'hidden'
  const paused = pauseWhenHidden && hidden

  useEffect(() => {
    if (delayMs === null || paused) return
    const id = setInterval(() => callbackRef.current(), delayMs)
    return () => clearInterval(id)
  }, [delayMs, paused, callbackRef])
}
