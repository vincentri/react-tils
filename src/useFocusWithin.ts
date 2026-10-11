import { useEffect, useState } from 'react'
import { useLatest } from './internal/useLatest'

export type FocusWithinOptions = {
  /** Focus moved into the element from outside. */
  onEnter?: () => void
  /** Focus left the element and everything in it: Tab past the end, Shift+Tab, or a click elsewhere. */
  onLeave?: () => void
}

/**
 * Whether focus is on the element or anything inside it, like CSS
 * `:focus-within`, with callbacks when focus enters or leaves. Moving focus
 * between children inside doesn't count as leaving.
 *
 * Switching to another window or tab doesn't count either: focus is still
 * there when the user comes back. Content in a React portal is outside in the
 * DOM, so focus moving into it counts as leaving: put the ref on an element
 * that contains the portal's target too.
 *
 * Use when: closing a menu, popover, or combobox list when keyboard users Tab
 * out of it, which `useClickOutside` alone misses; saving or collapsing an
 * inline editor when focus leaves it; showing toolbar actions while a
 * composer is focused.
 * Don't use when: only styling; use CSS `:focus-within`. For a modal, keep
 * focus inside with `useFocusTrap` instead. On iOS, tapping a button doesn't
 * focus it, so pair this with `useClickOutside` for pointer users.
 *
 * Other libraries call this `useFocusWithin` (react-aria, Mantine), `useFocusOutside`.
 *
 * @param options - `onEnter`, `onLeave`. Optional; can change every render.
 * @returns `[ref, focused]`.
 *
 * @example
 * const [open, setOpen] = useState(false)
 * const outsideRef = useClickOutside(() => setOpen(false), open)
 * const [focusRef] = useFocusWithin({ onLeave: () => setOpen(false) })
 * const ref = useMergedRefs(outsideRef, focusRef)
 * return (
 *   <div ref={ref}>
 *     <button onClick={() => setOpen(!open)}>Menu</button>
 *     {open && <ul>…</ul>}
 *   </div>
 * )
 */
export function useFocusWithin<T extends Element = HTMLElement>(
  options: FocusWithinOptions = {},
): [(element: T | null) => void, boolean] {
  const [element, setElement] = useState<T | null>(null)
  const [focused, setFocused] = useState(false)
  const optionsRef = useLatest(options)

  useEffect(() => {
    if (!element) return
    // Focus may already be inside (an autoFocus child) before the listeners exist.
    let inside = element.contains(document.activeElement)
    // oxlint-disable-next-line react/set-state-in-effect -- reads where DOM focus already is
    setFocused(inside)
    let timer: ReturnType<typeof setTimeout> | undefined
    const set = (next: boolean) => {
      if (next === inside) return
      inside = next
      setFocused(next)
      ;(next ? optionsRef.current.onEnter : optionsRef.current.onLeave)?.()
    }
    const onFocusIn = () => {
      clearTimeout(timer)
      set(true)
    }
    // Decide once focus has settled: it may be moving to a sibling inside (focusin follows), or the
    // window may have lost focus, which keeps activeElement where it was.
    const onFocusOut = () => {
      clearTimeout(timer)
      timer = setTimeout(() => set(element.contains(document.activeElement)))
    }
    element.addEventListener('focusin', onFocusIn)
    element.addEventListener('focusout', onFocusOut)
    return () => {
      clearTimeout(timer)
      element.removeEventListener('focusin', onFocusIn)
      element.removeEventListener('focusout', onFocusOut)
    }
  }, [element, optionsRef])

  return [setElement, focused]
}
