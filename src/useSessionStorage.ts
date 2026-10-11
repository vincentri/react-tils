import { type SetValue, useStorage } from './internal/storage'

/**
 * State that persists in `sessionStorage` as JSON for the life of the tab,
 * stays in sync across components, and is safe to server-render.
 *
 * Renders `serverValue` on the server and during hydration, then switches to the
 * stored value with no hydration mismatch. Missing or unparseable stored values
 * also read as `serverValue`. Setting `undefined` removes the key.
 *
 * Values go through JSON: a `Date` comes back as a string, and `Map`, `Set`,
 * `Infinity`, and `undefined` inside objects don't survive. Store plain data.
 * Writes made directly with `sessionStorage` in the same tab aren't seen; go
 * through the setter.
 *
 * Use when: state should survive a reload but not outlive the tab, and each tab
 * keeps its own copy (multi-step form progress, scroll restore, a dismissed
 * banner for this visit).
 * Don't use when: the state should be shared between tabs or survive closing
 * the tab; use `useLocalStorage`. Same limits as localStorage: no sensitive
 * data (any script on the page can read it), no large data.
 *
 * Other libraries call this `useSessionStorageState`.
 *
 * @param key - The sessionStorage key.
 * @param serverValue - Value on the server, during hydration, and when nothing
 * valid is stored. Pass a primitive or a constant, so the setter stays stable.
 * @returns `[value, setValue]`, like `useState`. `setValue` accepts a value or
 * an updater. If storage is full or blocked, the value still updates for this
 * page session but isn't saved.
 *
 * @example
 * const [step, setStep] = useSessionStorage('checkout-step', 1)
 * setStep((s) => s + 1)
 *
 * const [dismissed, setDismissed] = useSessionStorage('promo-dismissed', false)
 */
export function useSessionStorage<T>(key: string, serverValue: T): [T, SetValue<T>] {
  return useStorage('sessionStorage', key, serverValue)
}
