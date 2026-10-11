import { useCallback, useMemo, useSyncExternalStore } from 'react'

// Shared by useLocalStorage and useSessionStorage.

export type Area = 'localStorage' | 'sessionStorage'
export type SetValue<T> = (next: T | ((prev: T) => T)) => void

// `storage` events only reach other documents, so same-tab writes notify these directly.
const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

// Values that couldn't be written (storage full or blocked) live here for this page session,
// so the UI still updates instead of the setter throwing.
const memory = new Map<string, string | null>()

function readRaw(area: Area, key: string): string | null {
  const id = `${area}:${key}`
  if (memory.has(id)) return memory.get(id)!
  try {
    return window[area].getItem(key)
  } catch {
    return null // storage disabled (e.g. blocked cookies, some private modes)
  }
}

function parse<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback // corrupted or written by other code; leave it, don't overwrite
  }
}

export function useStorage<T>(area: Area, key: string, serverValue: T): [T, SetValue<T>] {
  // Snapshot is the raw string: a stable primitive, so unchanged storage never re-renders.
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(area, key),
    () => null,
  )
  const value = useMemo(() => parse(raw, serverValue), [raw, serverValue])

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === 'function'
          ? (next as (prev: T) => T)(parse(readRaw(area, key), serverValue))
          : next
      const serialized = resolved === undefined ? null : JSON.stringify(resolved)
      const id = `${area}:${key}`
      try {
        if (serialized === null) window[area].removeItem(key)
        else window[area].setItem(key, serialized)
        memory.delete(id)
      } catch {
        memory.set(id, serialized)
      }
      listeners.forEach((fn) => fn())
    },
    [area, key, serverValue],
  )

  return [value, setValue]
}
