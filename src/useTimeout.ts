import { useCallback, useEffect, useRef } from 'react'
import { useLatest } from './internal/useLatest'

/**
 * Calls `callback` once, `delayMs` after mount or after `delayMs` changes.
 * Pass `null` to cancel. Always calls the latest `callback`. Cleared on
 * unmount. Nothing runs on the server.
 *
 * Returns `restart`, which starts the delay over: for a "Saved ✓" label that
 * should stay for 2s after the latest save, not the first one.
 *
 * Use when: auto-dismissing a toast, hiding a "Saved" or "Copied" label, or a
 * delay before showing a spinner. Pause a toast on hover by passing `null`.
 * Don't use when: it should repeat; use `useInterval`. To wait until the user
 * stops typing, use `useDebouncedCallback` or `useDebouncedValue`. For "Copied!"
 * after copying, `useCopyToClipboard` already resets itself.
 *
 * Other libraries call this `useTimeoutFn`.
 *
 * @param callback - Called when the delay ends. Can change every render.
 * @param delayMs - Milliseconds to wait, or `null` to cancel.
 * @returns `restart`: start the delay over. Does nothing while `delayMs` is `null`.
 *
 * @example
 * function Toast({ onClose }: { onClose: () => void }) {
 *   const [hovered, setHovered] = useState(false)
 *   useTimeout(onClose, hovered ? null : 5000)
 *   return <div onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>Saved</div>
 * }
 *
 * // Show "Saved" for 2s after the latest save.
 * const [saved, setSaved] = useState(false)
 * const restart = useTimeout(() => setSaved(false), 2000)
 * const onSave = () => { setSaved(true); restart() }
 */
export function useTimeout(callback: () => void, delayMs: number | null): () => void {
  const callbackRef = useLatest(callback)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // A restart after unmount must not leave a timer behind.
  const mounted = useRef(false)

  const restart = useCallback(() => {
    clearTimeout(timer.current)
    if (delayMs === null || !mounted.current) return
    timer.current = setTimeout(() => callbackRef.current(), delayMs)
  }, [delayMs, callbackRef])

  useEffect(() => {
    mounted.current = true
    restart()
    return () => {
      mounted.current = false
      clearTimeout(timer.current)
    }
  }, [restart])

  return restart
}
