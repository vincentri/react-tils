import { type RefObject, useRef } from 'react'
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect'

// Ref that always holds the latest value, so listeners can call the newest
// handler without re-subscribing. Updated in a layout effect, not during render.
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value)
  useIsomorphicLayoutEffect(() => {
    ref.current = value
  })
  return ref
}
