import { type SetValue, useStorage } from './internal/storage'

/**
 * State that persists in `localStorage` as JSON, stays in sync across
 * components and browser tabs, and is safe to server-render.
 *
 * Renders `serverValue` on the server and during hydration, then switches to the
 * stored value with no hydration mismatch. Missing or unparseable stored values
 * also read as `serverValue`. Setting `undefined` removes the key.
 *
 * Values go through JSON: a `Date` comes back as a string, and `Map`, `Set`,
 * `Infinity`, and `undefined` inside objects don't survive. Store plain data.
 * Writes made directly with `localStorage` in the same tab aren't seen; go
 * through the setter.
 *
 * Use when: user preferences, drafts, or UI state should survive a reload or be
 * shared between tabs (theme, sidebar open, last tab).
 * Don't use when: the data is sensitive (tokens, personal data). Any script on
 * the page can read localStorage. Also not for large data (5 MB limit, blocks
 * the main thread); use IndexedDB. Not for server-needed state; use cookies.
 *
 * Other libraries call this `useLocalStorageState`.
 *
 * @param key - The localStorage key.
 * @param serverValue - Value on the server, during hydration, and when nothing
 * valid is stored. Pass a primitive or a constant, so the setter stays stable.
 * @returns `[value, setValue]`, like `useState`. `setValue` accepts a value or
 * an updater. If storage is full or blocked, the value still updates for this
 * page session but isn't saved.
 *
 * @example
 * const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light')
 * setTheme('dark')
 *
 * const [count, setCount] = useLocalStorage('count', 0)
 * setCount((c) => c + 1)
 */
export function useLocalStorage<T>(key: string, serverValue: T): [T, SetValue<T>] {
  return useStorage('localStorage', key, serverValue)
}
