import { useEffect } from 'react'
import { useLatest } from './internal/useLatest'

/**
 * Calls `callback` on every animation frame while `active`, with the time
 * since the previous frame. Always calls the latest `callback`, so it can read
 * current props without restarting the loop. Cancelled on unmount and when
 * `active` turns false. Browsers pause it in background tabs.
 *
 * The callback runs outside React rendering: write to a ref, a canvas, or a
 * style directly. Calling `setState` every frame re-renders 60+ times a second.
 *
 * Use when: drawing on a canvas, a game loop, physics, or smoothing a value
 * that follows the pointer.
 * Don't use when: CSS transitions, CSS animations, or the Web Animations API
 * (`element.animate()`) can do it; they can run off the main thread. For work
 * every second or slower, use `useInterval`.
 *
 * Other libraries call this `useRafLoop`.
 *
 * @param callback - Called each frame with `deltaMs` (0 on the first frame)
 * and the frame timestamp `timeMs`. Can change every render.
 * @param active - Run while `true`. Default `true`.
 *
 * @example
 * const canvas = useRef<HTMLCanvasElement>(null)
 * const x = useRef(0)
 * useAnimationFrame((deltaMs) => {
 *   x.current = (x.current + deltaMs * 0.1) % 300
 *   const ctx = canvas.current?.getContext('2d')
 *   ctx?.clearRect(0, 0, 300, 50)
 *   ctx?.fillRect(x.current, 10, 30, 30)
 * }, playing)
 */
export function useAnimationFrame(
  callback: (deltaMs: number, timeMs: number) => void,
  active = true,
): void {
  const callbackRef = useLatest(callback)

  useEffect(() => {
    if (!active) return
    let id: number
    let previous: number | undefined
    const frame = (time: number) => {
      callbackRef.current(previous === undefined ? 0 : time - previous, time)
      previous = time
      id = requestAnimationFrame(frame)
    }
    id = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(id)
  }, [active, callbackRef])
}
