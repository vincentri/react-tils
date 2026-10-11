import { useEffect, useState } from 'react'
import { useLatest } from './internal/useLatest'

export type SwipeDirection = 'left' | 'right' | 'up' | 'down'

export type SwipeOptions = {
  /** Minimum distance in pixels. Default `50`. */
  threshold?: number
  /** Maximum duration in milliseconds; slower drags aren't swipes. Default `800`. */
  maxDurationMs?: number
}

/**
 * Calls `onSwipe` with `'left'`, `'right'`, `'up'`, or `'down'` when the user
 * swipes on an element, with touch, pen, or mouse. Returns a callback ref.
 *
 * Uses pointer events, so one handler covers every input. The direction is the
 * axis that moved most. Too short or too slow and it isn't a swipe.
 *
 * Use when: swiping between carousel slides, dismissing a card or
 * notification, or closing a drawer with a swipe.
 * Don't use when: you need the element to follow the finger while dragging;
 * use `useDrag`. For scrolling between items,
 * CSS scroll snap (`scroll-snap-type`) needs no JS. Swipes must have a button
 * or keyboard alternative.
 *
 * Set CSS `touch-action` on the element so the browser doesn't take the
 * gesture for scrolling: `pan-y` for horizontal swipes, `pan-x` for vertical,
 * `none` for both.
 *
 * @param onSwipe - Called with the direction and the `pointerup` event. Can change every render.
 * @param options - `threshold` and `maxDurationMs`. Optional.
 * @returns A callback ref. Pass it to the element's `ref` prop.
 *
 * @example
 * const ref = useSwipe<HTMLDivElement>((direction) => {
 *   if (direction === 'left') next()
 *   if (direction === 'right') previous()
 * })
 * return <div ref={ref} style={{ touchAction: 'pan-y' }}><Slide /></div>
 */
export function useSwipe<T extends HTMLElement = HTMLElement>(
  onSwipe: (direction: SwipeDirection, event: PointerEvent) => void,
  options: SwipeOptions = {},
): (element: T | null) => void {
  const { threshold = 50, maxDurationMs = 800 } = options
  const [element, setElement] = useState<T | null>(null)
  const onSwipeRef = useLatest(onSwipe)

  useEffect(() => {
    if (!element) return
    let start: { x: number; y: number; time: number; id: number } | null = null

    const onDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return
      start = { x: event.clientX, y: event.clientY, time: event.timeStamp, id: event.pointerId }
    }
    const onUp = (event: PointerEvent) => {
      if (!start || event.pointerId !== start.id) return
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      const elapsed = event.timeStamp - start.time
      start = null
      if (elapsed > maxDurationMs || Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return
      const direction: SwipeDirection =
        Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
      onSwipeRef.current(direction, event)
    }
    const onCancel = () => {
      start = null
    }

    element.addEventListener('pointerdown', onDown)
    // Listen on window so a swipe that ends outside the element still counts.
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      element.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [element, threshold, maxDurationMs, onSwipeRef])

  return setElement
}
