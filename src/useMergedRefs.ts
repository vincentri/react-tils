import { type Ref, useCallback, useRef } from 'react'
import { useIsomorphicLayoutEffect } from './internal/useIsomorphicLayoutEffect'

type Cleanup = (() => void) | void

function assign<T>(ref: Ref<T> | undefined, value: T | null): Cleanup {
  if (typeof ref === 'function') return ref(value) as Cleanup
  if (ref) (ref as { current: T | null }).current = value
}

// A React 19 callback ref that returned a cleanup gets the cleanup, not a call with null.
function detach<T>(ref: Ref<T> | undefined, cleanup: Cleanup): void {
  if (typeof cleanup === 'function') cleanup()
  else assign(ref, null)
}

type State<T> = { element: T | null; refs: (Ref<T> | undefined)[]; cleanups: Cleanup[] }

/**
 * Combines several refs into one callback ref, so one element can have a
 * `useRef`, a forwarded `ref` prop, and refs from hooks such as `useInView`
 * and `useElementSize` at the same time.
 *
 * Accepts ref objects, callback refs, `null`, and `undefined`. The merged ref
 * never changes; when one of the refs changes, the element moves to the new
 * ref right after render. Works with React 18, with React 19 callback refs
 * that return a cleanup function, and with React Compiler.
 *
 * Use when: two or more refs must point at the same element.
 * Don't use when: there is only one ref; pass it directly.
 *
 * Other libraries call this `useMergeRefs`, `useForkRef`, `mergeRefs`.
 *
 * @param refs - The refs to set.
 *
 * @example
 * function Section({ ref }: { ref?: Ref<HTMLElement> }) {
 *   const [inViewRef, inView] = useInView<HTMLElement>()
 *   const [sizeRef, { width }] = useElementSize<HTMLElement>()
 *   return <section ref={useMergedRefs(ref, inViewRef, sizeRef)}>…</section>
 * }
 */
export function useMergedRefs<T>(...refs: (Ref<T> | undefined)[]): (element: T | null) => void {
  // A stable callback that reads the latest refs: React Compiler needs literal dependency
  // lists, so the refs can't be the useCallback dependencies.
  const state = useRef<State<T>>({ element: null, refs, cleanups: [] })

  useIsomorphicLayoutEffect(() => {
    const current = state.current
    const previous = current.refs
    current.refs = refs
    if (current.element === null) return
    const length = Math.max(previous.length, refs.length)
    for (let i = 0; i < length; i++) {
      if (previous[i] === refs[i]) continue
      detach(previous[i], current.cleanups[i])
      current.cleanups[i] = assign(refs[i], current.element)
    }
  })

  return useCallback((element: T | null) => {
    const current = state.current
    current.element = element
    current.cleanups = current.refs.map((ref) => assign(ref, element))
    // React 19 calls this instead of calling the ref with null; React 18 ignores it.
    return () => {
      current.refs.forEach((ref, i) => detach(ref, current.cleanups[i]))
      current.element = null
    }
  }, [])
}
