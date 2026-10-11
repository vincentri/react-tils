import { useState } from 'react'

/**
 * The value `value` had before it last changed, or `undefined` until it first
 * changes. Re-renders that don't change `value` keep the same previous value,
 * so it answers "what was it before?", not "what was it last render?".
 *
 * Kept in state, not read from a ref during render, so it's correct under
 * the React Compiler, Strict Mode, and concurrent rendering, where the common
 * ref version (`useRef` + `useEffect`) shows stale or skipped values.
 * Compares with `Object.is`, like React: a new object or array each render
 * counts as a change, so pass a primitive or a memoized value.
 *
 * Use when: rendering from the change itself: a direction (price up or down,
 * slide left or right), "changed from X to Y", or animating from the old
 * value.
 * Don't use when: you want to run code when a value changes; do it in the
 * event handler that changes it, or in an effect with that value as a
 * dependency. For a prop to state copy, see `useControllableState`.
 *
 * @param value - The value to follow.
 * @returns The value before the latest change, or `undefined` before any change.
 *
 * @example
 * const previous = usePrevious(price)
 * const trend = previous === undefined ? '' : price > previous ? '▲' : price < previous ? '▼' : ''
 * return <span>{price} {trend}</span>
 */
export function usePrevious<T>(value: T): T | undefined {
  const [state, setState] = useState<{ value: T; previous: T | undefined }>({
    value,
    previous: undefined,
  })
  // Updating state during render: React re-renders right away, before anything is shown.
  if (!Object.is(state.value, value)) setState({ value, previous: state.value })
  return state.previous
}
