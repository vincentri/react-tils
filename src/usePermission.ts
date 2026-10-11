import { useCallback, useSyncExternalStore } from 'react'

export type PermissionValue = PermissionState | 'unknown'

type Entry = {
  status: PermissionStatus | null
  listeners: Set<() => void>
  queried: boolean
  notify: () => void
}

// One entry per permission name, shared by every component. The status is kept after the
// last unmount so later mounts get the answer instantly; its listener is not.
const entries = new Map<string, Entry>()

function entryFor(name: string): Entry {
  let entry = entries.get(name)
  if (!entry) {
    const listeners = new Set<() => void>()
    entry = {
      status: null,
      listeners,
      queried: false,
      notify: () => listeners.forEach((fn) => fn()),
    }
    entries.set(name, entry)
  }
  return entry
}

function query(name: string, entry: Entry) {
  entry.queried = true
  // Unsupported names reject, or throw synchronously in some browsers: either way 'unknown'.
  try {
    navigator.permissions?.query({ name } as PermissionDescriptor).then(
      (status) => {
        entry.status = status
        if (entry.listeners.size > 0) status.addEventListener('change', entry.notify)
        entry.notify()
      },
      () => {},
    )
  } catch {}
}

/**
 * The current state of a browser permission (`'granted'`, `'denied'`,
 * `'prompt'`), updated when the user changes it in browser settings.
 *
 * Returns `'unknown'` on the server, during hydration, while the browser
 * answers (one async query, shared by every component), and when the browser
 * does not support querying that permission. Never triggers a permission
 * prompt.
 *
 * Use when: deciding whether to show a "Enable notifications" or "Use my
 * location" button, or explaining how to re-enable a denied permission.
 * Don't use when: you need to ask for the permission; call the feature's own
 * API from a user action (e.g. `Notification.requestPermission()`, or
 * `useGeolocation`). Treat `'unknown'` as "might work": support differs a lot
 * between browsers (e.g. Firefox and Safari don't support querying camera).
 *
 * @param name - A permission name, e.g. `'geolocation'`, `'notifications'`,
 * `'camera'`, `'microphone'`, `'clipboard-read'`.
 *
 * @example
 * const permission = usePermission('notifications')
 * if (permission === 'denied') return <p>Notifications are blocked in your browser settings.</p>
 * if (permission !== 'granted') return <button onClick={() => Notification.requestPermission()}>Enable notifications</button>
 */
export function usePermission(name: PermissionName | (string & {})): PermissionValue {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const entry = entryFor(name)
      entry.listeners.add(onChange)
      if (!entry.queried) query(name, entry)
      else if (entry.listeners.size === 1) entry.status?.addEventListener('change', entry.notify)
      return () => {
        entry.listeners.delete(onChange)
        if (entry.listeners.size === 0) entry.status?.removeEventListener('change', entry.notify)
      }
    },
    [name],
  )
  return useSyncExternalStore(
    subscribe,
    () => entryFor(name).status?.state ?? 'unknown',
    () => 'unknown',
  )
}
