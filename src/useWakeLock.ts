import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useDocumentVisibility } from './useDocumentVisibility'

const subscribeNothing = () => () => {}

/**
 * Keeps the screen from dimming or locking while `enabled` is `true`, using
 * the Screen Wake Lock API.
 *
 * The browser releases the lock whenever the tab is hidden; this hook
 * re-acquires it when the tab is visible again. Released on unmount or when
 * disabled. `supported` and `active` are `false` on the server and during
 * hydration. Unsupported browsers or refused requests (e.g. low battery) just
 * leave `active` as `false`.
 *
 * Use when: the user reads or follows along without touching the screen, e.g.
 * a recipe, a presentation, a timer, turn-by-turn directions, or a QR code
 * ticket.
 * Don't use when: video is playing; browsers already keep the screen on. Don't
 * enable it for the whole app: it drains the battery. Turn it on for the
 * screen that needs it.
 *
 * @param enabled - Keep the screen awake while `true`. Default `true`.
 * @returns `{ supported, active }`.
 *
 * @example
 * const [cooking, setCooking] = useState(false)
 * const { supported } = useWakeLock(cooking)
 * return supported ? <Toggle checked={cooking} onChange={setCooking}>Keep screen on</Toggle> : null
 */
export function useWakeLock(enabled = true): { supported: boolean; active: boolean } {
  const supported = useSyncExternalStore(
    subscribeNothing,
    () => 'wakeLock' in navigator,
    () => false,
  )
  const visible = useDocumentVisibility() === 'visible'
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!enabled || !visible || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false
    navigator.wakeLock.request('screen').then(
      (lock) => {
        if (cancelled) {
          void lock.release()
          return
        }
        sentinel = lock
        setActive(true)
        // Fires when we release it, or when the browser does (tab hidden).
        lock.addEventListener('release', () => setActive(false), { once: true })
      },
      () => setActive(false),
    )
    return () => {
      cancelled = true
      void sentinel?.release()
    }
  }, [enabled, visible])

  return useMemo(() => ({ supported, active: enabled && active }), [supported, enabled, active])
}
