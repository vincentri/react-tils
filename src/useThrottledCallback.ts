import { useEffect, useMemo } from 'react'
import { useLatest } from './internal/useLatest'
import type { DebouncedFunction } from './useDebouncedCallback'

/** Same shape as a debounced function: callable, with `cancel`, `flush`, and `pending`. */
export type ThrottledFunction<A extends unknown[]> = DebouncedFunction<A>

// Plain timer logic, outside React: the hook only decides when to create and cancel one.
function createThrottled<A extends unknown[]>(
  callbackRef: { readonly current: (...args: A) => void },
  intervalMs: number,
): ThrottledFunction<A> {
  let lastRun = -Infinity
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastArgs: A | null = null

  const run = () => {
    clearTimeout(timer)
    timer = undefined
    lastRun = Date.now()
    const args = lastArgs!
    lastArgs = null
    callbackRef.current(...args)
  }
  const throttled = (...args: A) => {
    lastArgs = args
    if (timer !== undefined) return
    const wait = lastRun + intervalMs - Date.now()
    if (wait <= 0) run()
    else timer = setTimeout(run, wait)
  }
  throttled.cancel = () => {
    clearTimeout(timer)
    timer = undefined
    lastArgs = null
  }
  throttled.flush = () => {
    if (timer !== undefined) run()
  }
  throttled.pending = () => timer !== undefined
  return throttled
}

/**
 * Returns a throttled version of `callback`: it runs right away, then at most
 * once every `intervalMs` while calls keep coming, and once more at the end
 * with the arguments of the last call, so the final value is never lost. The
 * returned function is stable and always runs the latest `callback`.
 *
 * A pending call is dropped on unmount (call `flush` first to keep it) and
 * when `intervalMs` changes.
 *
 * Use when: work that should keep happening during a burst, not only after
 * it: live search results while typing, saving a slider's position, sending
 * "typing…" or cursor positions to a server, analytics for scroll depth.
 * Don't use when: it should run once after the user stops (autosave a draft,
 * validate); use `useDebouncedCallback`. To follow scroll or size, use
 * `useWindowScroll`, `useElementScroll`, or `useElementSize`, which already
 * avoid extra re-renders. For drawing on every frame, use `useAnimationFrame`.
 *
 * Other libraries call this `useThrottleFn`, `useThrottleCallback`, `useThrottle`.
 *
 * @param callback - The function to throttle. Can change every render.
 * @param intervalMs - Run at most once per this many milliseconds.
 * @returns The throttled function, with `cancel`, `flush`, and `pending`.
 *
 * @example
 * const sendCursor = useThrottledCallback((x: number, y: number) => socket.send({ x, y }), 100)
 * return <div onPointerMove={(e) => sendCursor(e.clientX, e.clientY)} />
 */
export function useThrottledCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  intervalMs: number,
): ThrottledFunction<A> {
  const callbackRef = useLatest(callback)
  const throttled = useMemo(
    () => createThrottled(callbackRef, intervalMs),
    [intervalMs, callbackRef],
  )
  useEffect(() => () => throttled.cancel(), [throttled])
  return throttled
}
