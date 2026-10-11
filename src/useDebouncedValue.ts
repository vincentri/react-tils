import { useEffect, useState } from 'react'

/**
 * Returns `value`, but only after it has stopped changing for `delayMs`.
 * Starts as `value` (also on the server), then lags behind while it changes.
 *
 * Use when: deriving a request from fast-changing state, e.g. fetching search
 * results for a query typed into a controlled input.
 * Don't use when: you have an event handler to debounce instead of a value;
 * use `useDebouncedCallback`, which also has `cancel` and `flush`. To keep
 * typing responsive while rendering something expensive, use React's
 * `useDeferredValue`, which has no fixed delay.
 *
 * With Chinese, Japanese, or Korean input, the text changes in steps while a
 * character is composed. Keep the input's own state updating, and debounce a
 * separate query that you set only when `e.nativeEvent.isComposing` is false
 * and in `onCompositionEnd`.
 *
 * Other libraries call this `useDebounce`, `useDebounceValue`.
 *
 * @param value - The value to debounce. Compared with `Object.is`: pass a
 * primitive or a memoized object. A new array or object every render
 * re-renders every `delayMs` forever.
 * @param delayMs - How long `value` must stay unchanged.
 *
 * @example
 * const [query, setQuery] = useState('')
 * const debouncedQuery = useDebouncedValue(query, 300)
 * const results = useSearch(debouncedQuery) // your data-fetching hook
 * return <input value={query} onChange={(e) => setQuery(e.target.value)} />
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(() => value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
