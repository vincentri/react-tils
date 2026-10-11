import { useCallback, useState } from 'react'
import type { SetValue } from './internal/storage'
import { useLatest } from './internal/useLatest'

/**
 * State for a component that can be controlled (the parent passes `value` and
 * `onChange`) or uncontrolled (the parent passes only a default), like a
 * native `<input>` with `value` or `defaultValue`.
 *
 * Returns `[value, setValue]` like `useState`. `setValue` calls `onChange`
 * only when the value actually changes, and accepts an updater function that
 * sees the latest value, also for several calls in one event. Controlled while
 * `value` is not `undefined`; don't switch between the two.
 *
 * Use when: building a reusable component (tabs, accordion, toggle, select,
 * dialog `open`) whose parent may or may not want to own the state.
 * Don't use when: the state is only used inside one component; use `useState`.
 * Never copy a prop into state with `useState(prop)` + `useEffect` to sync it:
 * the copy goes stale or flickers. Use this hook instead.
 *
 * Other libraries call this `useControlled`, `useUncontrolled`, `useControllableValue`.
 *
 * @param value - The controlled value, or `undefined` when uncontrolled.
 * @param defaultValue - The starting value when uncontrolled.
 * @param onChange - Called with the new value on every change. Optional.
 *
 * @example
 * type Props = { open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void }
 * function Disclosure({ open: openProp, defaultOpen = false, onOpenChange }: Props) {
 *   const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange)
 *   return <button aria-expanded={open} onClick={() => setOpen((o) => !o)}>Details</button>
 * }
 */
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void,
): [T, SetValue<T>] {
  const [internal, setInternal] = useState(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? value : internal
  const currentRef = useLatest(current)
  const controlledRef = useLatest(controlled)
  const onChangeRef = useLatest(onChange)

  const setValue = useCallback<SetValue<T>>(
    (next) => {
      const prev = currentRef.current
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next
      if (Object.is(resolved, prev)) return
      // Seen by a second call in the same event; reset from props on the next render.
      currentRef.current = resolved
      if (!controlledRef.current) setInternal(() => resolved)
      onChangeRef.current?.(resolved)
    },
    [currentRef, controlledRef, onChangeRef],
  )

  return [current, setValue]
}
