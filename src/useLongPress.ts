import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { useLatest } from './internal/useLatest'

export type LongPressOptions = {
  /** How long to hold, in milliseconds. Default `500`. */
  delayMs?: number
  /** Cancel if the pointer moves more than this many pixels (e.g. the user is scrolling). Default `10`. */
  moveTolerance?: number
}

/** Spread these onto the element: `<button {...longPress}>`. */
export type LongPressHandlers = {
  onPointerDown: (event: ReactPointerEvent) => void
  onPointerMove: (event: ReactPointerEvent) => void
  onPointerUp: () => void
  onPointerLeave: () => void
  onPointerCancel: () => void
  onContextMenu: (event: ReactMouseEvent) => void
  onClickCapture: (event: ReactMouseEvent) => void
}

/**
 * Calls `onLongPress` when the user presses and holds an element, with mouse,
 * touch, or pen. Returns event handlers to spread onto the element.
 *
 * Cancels if the pointer is released, leaves, or moves past `moveTolerance`
 * (so scrolling on a phone doesn't trigger it). Only the primary button
 * counts. After a long press, the click that follows is swallowed, so the
 * element's `onClick` doesn't also run, and the mobile context menu is
 * suppressed while holding.
 *
 * Use when: secondary actions on touch devices, e.g. select an item in a list,
 * show a preview, or "hold to delete".
 * Don't use when: it is the only way to reach an action; long press is hard to
 * discover and not keyboard accessible, so offer a button or menu too. Add CSS
 * `user-select: none; -webkit-touch-callout: none` on the element to stop text
 * selection on iOS.
 *
 * @param onLongPress - Called with the original pointer event once the hold completes.
 * @param options - `delayMs` and `moveTolerance`. Optional.
 * @returns Handlers to spread onto the element.
 *
 * @example
 * const longPress = useLongPress(() => setSelected(item.id))
 * return (
 *   <li {...longPress} onClick={() => open(item)}>
 *     {item.name}
 *   </li>
 * )
 */
export function useLongPress(
  onLongPress: (event: ReactPointerEvent) => void,
  options: LongPressOptions = {},
): LongPressHandlers {
  const { delayMs = 500, moveTolerance = 10 } = options
  const handlerRef = useLatest(onLongPress)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const start = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  useEffect(() => () => clearTimeout(timer.current), [])

  return useMemo(() => {
    const cancel = () => {
      clearTimeout(timer.current)
      timer.current = undefined
      start.current = null
    }
    return {
      onPointerDown: (event: ReactPointerEvent) => {
        if (event.button !== 0) return
        cancel()
        fired.current = false
        start.current = { x: event.clientX, y: event.clientY }
        timer.current = setTimeout(() => {
          timer.current = undefined
          fired.current = true
          handlerRef.current(event)
        }, delayMs)
      },
      onPointerMove: (event: ReactPointerEvent) => {
        if (!start.current) return
        const moved = Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y)
        if (moved > moveTolerance) cancel()
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (event: ReactMouseEvent) => {
        if (timer.current !== undefined || fired.current) event.preventDefault()
      },
      onClickCapture: (event: ReactMouseEvent) => {
        if (!fired.current) return
        fired.current = false
        event.preventDefault()
        event.stopPropagation()
      },
    }
  }, [delayMs, moveTolerance, handlerRef])
}
