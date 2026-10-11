import { useEffect, useState } from 'react'

export type PointerPosition = {
  /** Pixels from the element's left edge. */
  x: number
  /** Pixels from the element's top edge. */
  y: number
}

/**
 * Where the mouse, pen, or finger is over an element, in pixels from its
 * top-left corner, or `null` while it's outside (and on the server). Attach
 * the returned ref to the element.
 *
 * With a mouse it follows hovering; with a finger, only while it touches, and
 * it turns `null` when the finger lifts. Re-renders on every move, so keep the
 * component small, or skip React for pure visuals (see below).
 *
 * Use when: a spotlight or glow that follows the cursor on a card, a tooltip
 * or magnifier at the pointer, crosshairs on a chart, or a hover preview that
 * depends on the position (scrubbing a video thumbnail).
 * Don't use when: plain hover styling (CSS `:hover`); a drag (`useDrag`); or
 * a page-wide custom cursor, which re-renders the whole app per move: use
 * `useEventListener('window', 'pointermove', …)` and set a CSS variable or
 * `transform` on the element directly.
 *
 * Other libraries call this `useMouse` (react-use), `useMousePosition`, `usePointer`.
 *
 * @returns `[ref, position]`: `position` is `{ x, y }`, or `null` while the pointer is outside.
 *
 * @example
 * const [ref, pointer] = usePointerPosition<HTMLDivElement>()
 * return (
 *   <div
 *     ref={ref}
 *     className="card"
 *     style={{ '--x': `${pointer?.x ?? -999}px`, '--y': `${pointer?.y ?? -999}px` } as CSSProperties}
 *   />
 * )
 * // .card { background: radial-gradient(200px at var(--x) var(--y), #fff3, transparent) }
 */
export function usePointerPosition<T extends Element = HTMLElement>(): [
  (element: T | null) => void,
  PointerPosition | null,
] {
  const [element, setElement] = useState<T | null>(null)
  const [position, setPosition] = useState<PointerPosition | null>(null)

  useEffect(() => {
    if (!element) return
    const move = (event: Event) => {
      const { clientX, clientY } = event as PointerEvent
      const box = element.getBoundingClientRect()
      setPosition({ x: clientX - box.left, y: clientY - box.top })
    }
    const leave = () => setPosition(null)
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerleave', leave)
    return () => {
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerleave', leave)
      setPosition(null)
    }
  }, [element])

  return [setElement, position]
}
