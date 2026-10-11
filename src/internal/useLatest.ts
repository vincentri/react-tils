import { type RefObject, useInsertionEffect, useRef } from 'react'

// Ref that always holds the latest value, so listeners can call the newest handler without
// re-subscribing. Updated in an insertion effect: not during render, before any layout or passive
// effect reads it, and with no server-render warning (unlike useLayoutEffect in React 18).
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value)
  useInsertionEffect(() => {
    ref.current = value
  })
  return ref
}
