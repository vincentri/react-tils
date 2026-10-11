import { useEffect, useMemo } from 'react'
import { useLatest } from './internal/useLatest'

export type DebouncedFunction<A extends unknown[]> = ((...args: A) => void) & {
  /** Drop the pending call. */
  cancel: () => void
  /** Run the pending call now, if there is one. */
  flush: () => void
  /** Whether a call is waiting. Reads it now; doesn't re-render when it changes, so keep state for a "Saving…" label. */
  pending: () => boolean
}

// Plain timer logic, outside React: the hook only decides when to create and cancel one.
function createDebounced<A extends unknown[]>(
  callbackRef: { readonly current: (...args: A) => void },
  delayMs: number,
  maxWaitMs: number | undefined,
): DebouncedFunction<A> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let maxTimer: ReturnType<typeof setTimeout> | undefined
  let lastArgs: A | null = null

  const clear = () => {
    clearTimeout(timer)
    clearTimeout(maxTimer)
    timer = maxTimer = undefined
  }
  const flush = () => {
    clear()
    if (!lastArgs) return
    const args = lastArgs
    lastArgs = null
    callbackRef.current(...args)
  }
  const debounced = (...args: A) => {
    lastArgs = args
    clearTimeout(timer)
    timer = setTimeout(flush, delayMs)
    if (maxWaitMs !== undefined && maxTimer === undefined) maxTimer = setTimeout(flush, maxWaitMs)
  }
  debounced.cancel = () => {
    clear()
    lastArgs = null
  }
  debounced.flush = flush
  debounced.pending = () => lastArgs !== null
  return debounced
}

/**
 * Returns a debounced version of `callback`: it runs `delayMs` after the last
 * call, with the arguments of that last call. The returned function is stable
 * and always runs the latest `callback`, so it can read current state.
 *
 * A pending call is dropped on unmount (call `flush` first to keep it) and
 * when `delayMs` or `maxWaitMs` change. With `maxWaitMs`, a burst of calls
 * still runs at least that often.
 *
 * Use when: search-as-you-type requests, autosaving a draft, or validating an
 * input after the user pauses.
 * Don't use when: you only want to keep typing responsive while rendering
 * something expensive; use React's `useDeferredValue`. To keep running during
 * a burst (live results, sending positions), use `useThrottledCallback`. For scroll or resize
 * values, prefer the dedicated hooks, which already avoid extra re-renders.
 *
 * With Chinese, Japanese, or Korean input, skip calls while
 * `e.nativeEvent.isComposing` is true and call it in `onCompositionEnd`, or
 * it runs on half-composed text.
 *
 * Other libraries call this `useDebounceCallback`, `useDebounceFn`.
 *
 * @param callback - The function to debounce. Can change every render.
 * @param delayMs - Wait this long after the last call.
 * @param options - `maxWaitMs`: run at least this often during a burst. Optional.
 * @returns The debounced function, with `cancel`, `flush`, and `pending`.
 *
 * @example
 * const search = useDebouncedCallback((query: string) => fetchResults(query), 300)
 * return <input onChange={(e) => search(e.target.value)} />
 *
 * // Autosave while typing, at least every 5s, and save on unmount.
 * const save = useDebouncedCallback(saveDraft, 1000, { maxWaitMs: 5000 })
 * useEffect(() => () => save.flush(), [save])
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delayMs: number,
  options: { maxWaitMs?: number } = {},
): DebouncedFunction<A> {
  const { maxWaitMs } = options
  const callbackRef = useLatest(callback)

  const debounced = useMemo(
    () => createDebounced(callbackRef, delayMs, maxWaitMs),
    [delayMs, maxWaitMs, callbackRef],
  )

  useEffect(() => () => debounced.cancel(), [debounced])
  return debounced
}
