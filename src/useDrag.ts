import { useEffect, useState } from 'react'
import { useLatest } from './internal/useLatest'

export type DragState = {
  /** Distance moved since the drag started, in pixels. */
  dx: number
  dy: number
  /** Distance moved since the previous call. */
  deltaX: number
  deltaY: number
  /** The first call of this drag. */
  first: boolean
  /** The last call: the pointer was released or the drag was cancelled. */
  last: boolean
  event: PointerEvent
}

export type DragOptions = {
  /** Listen while `true`. Default `true`. */
  enabled?: boolean
  /** Pixels the pointer must move before a drag starts, so clicks stay clicks. Default `3`. */
  threshold?: number
}

/**
 * Calls `onDrag` while the user drags an element with a mouse, finger, or
 * pen. Returns a callback ref for the element (the handle).
 *
 * Captures the pointer, so the drag keeps going when the pointer leaves the
 * element or the window, and ends on release or cancel. Movements under
 * `threshold` don't start a drag, so a click on the handle stays a click.
 * Text selection is blocked while dragging. Always calls the latest `onDrag`.
 *
 * Use when: resizable panels and splitters, custom sliders, dragging items
 * on a canvas or board, or pan to scroll.
 * Don't use when: you only need to know a swipe happened and its direction;
 * use `useSwipe`. For reordering lists, a drag-and-drop library handles
 * keyboard access and drop targets. Give touch handles CSS
 * `touch-action: none`, or the browser scrolls instead of dragging.
 *
 * Other libraries call this `useDraggable`, `useGesture` (`onDrag`), `usePointerDrag`.
 *
 * @param onDrag - Called on every move with `dx`, `dy`, `deltaX`, `deltaY`,
 * `first`, `last`, and the event. Can change every render.
 * @param options - `enabled`, `threshold`. Optional.
 * @returns A callback ref. Pass it to the element to drag.
 *
 * @example
 * // A splitter that resizes the sidebar.
 * const [width, setWidth] = useState(280)
 * const handle = useDrag(({ deltaX }) => setWidth((w) => Math.min(600, Math.max(160, w + deltaX))))
 * return (
 *   <div style={{ display: 'flex' }}>
 *     <aside style={{ width }}>…</aside>
 *     <div ref={handle} role="separator" style={{ width: 6, cursor: 'col-resize', touchAction: 'none' }} />
 *     <main>…</main>
 *   </div>
 * )
 */
export function useDrag<T extends HTMLElement = HTMLElement>(
  onDrag: (drag: DragState) => void,
  options: DragOptions = {},
): (element: T | null) => void {
  const { enabled = true, threshold = 3 } = options
  const [element, setElement] = useState<T | null>(null)
  const onDragRef = useLatest(onDrag)

  useEffect(() => {
    if (!element || !enabled) return
    let pointer: number | null = null
    let startX = 0
    let startY = 0
    let lastX = 0
    let lastY = 0
    let dragging = false

    const report = (event: PointerEvent, last: boolean) => {
      const first = !dragging
      dragging = true
      onDragRef.current({
        dx: event.clientX - startX,
        dy: event.clientY - startY,
        deltaX: event.clientX - lastX,
        deltaY: event.clientY - lastY,
        first,
        last,
        event,
      })
      lastX = event.clientX
      lastY = event.clientY
    }
    const onSelectStart = (event: Event) => event.preventDefault()
    const end = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return
      if (dragging) report(event, true)
      pointer = null
      dragging = false
      document.removeEventListener('selectstart', onSelectStart)
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId)
    }
    const onDown = (event: PointerEvent) => {
      if (pointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return
      pointer = event.pointerId
      startX = lastX = event.clientX
      startY = lastY = event.clientY
      element.setPointerCapture(event.pointerId)
      document.addEventListener('selectstart', onSelectStart)
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return
      if (!dragging && Math.hypot(event.clientX - startX, event.clientY - startY) < threshold)
        return
      report(event, false)
    }

    element.addEventListener('pointerdown', onDown)
    element.addEventListener('pointermove', onMove)
    element.addEventListener('pointerup', end)
    element.addEventListener('pointercancel', end)
    element.addEventListener('lostpointercapture', end)
    return () => {
      element.removeEventListener('pointerdown', onDown)
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerup', end)
      element.removeEventListener('pointercancel', end)
      element.removeEventListener('lostpointercapture', end)
      document.removeEventListener('selectstart', onSelectStart)
    }
  }, [element, enabled, threshold, onDragRef])

  return setElement
}
