import { useEffect, useState } from 'react'
import { useLatest } from './internal/useLatest'

/**
 * Calls `handler` when the user presses outside an element: mouse, touch, or
 * pen. Returns a callback ref to put on the element.
 *
 * Listens to `pointerdown` on the document, so it fires before focus moves and
 * works for touch. Uses `composedPath()`, so presses inside shadow DOM count
 * as inside.
 *
 * Use when: closing a dropdown, popover, or menu when the user presses
 * elsewhere.
 * Don't use when: you can use the native `<dialog>` or the `popover`
 * attribute, which close on outside click and Escape with no JS. Content
 * rendered in a portal is outside the element: put the ref on a wrapper that
 * contains both, or ignore those targets in the handler. Put the ref on a
 * wrapper around the toggle button too: if the button is outside, pressing it
 * closes the menu and its click then reopens it.
 *
 * Other libraries call this `useClickAway`, `useOnClickOutside`.
 *
 * @param handler - Called with the `PointerEvent`. Can change every render.
 * @param enabled - Listen only while `true`, e.g. while the menu is open. Default `true`.
 * @returns A callback ref. Pass it to the element's `ref` prop.
 *
 * @example
 * const [open, setOpen] = useState(false)
 * const ref = useClickOutside<HTMLDivElement>(() => setOpen(false), open)
 * // The ref wraps the button too, so pressing it toggles instead of closing and reopening.
 * return (
 *   <div ref={ref}>
 *     <button onClick={() => setOpen(!open)}>Menu</button>
 *     {open && <Menu />}
 *   </div>
 * )
 */
export function useClickOutside<T extends Element = HTMLElement>(
  handler: (event: PointerEvent) => void,
  enabled = true,
): (element: T | null) => void {
  const [element, setElement] = useState<T | null>(null)
  const handlerRef = useLatest(handler)

  useEffect(() => {
    if (!enabled || !element) return
    const listener = (event: PointerEvent) => {
      if (!event.composedPath().includes(element)) handlerRef.current(event)
    }
    document.addEventListener('pointerdown', listener)
    return () => document.removeEventListener('pointerdown', listener)
  }, [enabled, element, handlerRef])

  return setElement
}
