import { useCallback, useSyncExternalStore } from 'react'

/**
 * The current time as a timestamp in milliseconds, rounded down to
 * `intervalMs` and updated every `intervalMs`. Ticks land on whole intervals
 * (a 1000 ms clock changes exactly on the second), so every component using
 * the same interval shows the same time.
 *
 * The server and the client never agree on the time, so `new Date()` in render
 * causes a hydration mismatch. This hook returns `serverValue` (default
 * `null`) on the server and during hydration, then the real time.
 *
 * Use when: a clock, a countdown, "5 minutes ago" labels, or anything else that
 * renders the current time.
 * Don't use when: you need to run code on a schedule rather than render the
 * time; use `useInterval`. For a time read once, call `Date.now()` in an event
 * handler.
 *
 * @param intervalMs - How often to update, and the precision of the value.
 * @param serverValue - Value on the server and during hydration, e.g. the
 * request time passed from the server. Default `null`.
 *
 * @example
 * const now = useNow(1000)
 * return <time>{now === null ? '--:--:--' : new Date(now).toLocaleTimeString()}</time>
 *
 * // Relative time, updated every minute.
 * const now = useNow(60_000)
 * const minutes = now === null ? 0 : Math.round((now - sentAt) / 60_000)
 */
export function useNow<S extends number | null = null>(
  intervalMs: number,
  serverValue: S = null as S,
): number | S {
  // Derived from the clock, so the snapshot stays equal within an interval with no cache.
  const getSnapshot = useCallback(
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    [intervalMs],
  )
  const subscribe = useCallback(
    (onChange: () => void) => {
      let timer: ReturnType<typeof setTimeout>
      // Re-aligned on every tick, so timer drift never adds up.
      const schedule = () => {
        timer = setTimeout(
          () => {
            onChange()
            schedule()
          },
          intervalMs - (Date.now() % intervalMs),
        )
      }
      schedule()
      return () => clearTimeout(timer)
    },
    [intervalMs],
  )
  return useSyncExternalStore<number | S>(subscribe, getSnapshot, () => serverValue)
}
