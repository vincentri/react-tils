import { useEffect } from 'react'
import { useLatest } from './internal/useLatest'

export type HotkeyOptions = {
  /** Listen only while `true`. Default `true`. */
  enabled?: boolean
  /** Call `event.preventDefault()` on a match, e.g. to stop the browser's own `ctrl+k`. Default `true`. */
  preventDefault?: boolean
  /** Also fire while typing in inputs, textareas, selects, and contenteditable. Default `false` (Escape always fires). */
  enableInInputs?: boolean
}

const ALIASES: Record<string, string> = { esc: 'escape', space: ' ', plus: '+' }

// Each step of a sequence must follow the previous one within this time.
const SEQUENCE_MS = 1000

const isMac = () => /Mac|iPhone|iPad|iPod/.test(navigator.platform)

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  )
}

function matches(hotkey: string, event: KeyboardEvent): boolean {
  const parts = hotkey.toLowerCase().split('+')
  const rawKey = parts.pop() || '+' // 'mod++' ends with an empty part
  const key = ALIASES[rawKey] ?? rawKey
  const mods = new Set(parts.map((m) => (m === 'mod' ? (isMac() ? 'meta' : 'ctrl') : m)))
  if (event.key.toLowerCase() !== key) return false
  if (event.ctrlKey !== mods.has('ctrl') || event.altKey !== mods.has('alt')) return false
  if (event.metaKey !== mods.has('meta')) return false
  // Symbols like '?' need shift on most layouts, so only enforce shift for letters, digits, and named keys.
  const isSymbol = key.length === 1 && !/[a-z0-9 ]/.test(key)
  return isSymbol || event.shiftKey === mods.has('shift')
}

/**
 * Calls `handler` when a keyboard shortcut is pressed, e.g. `'Escape'`,
 * `'mod+k'`, `'shift+/'`.
 *
 * `mod` is Cmd on Apple devices and Ctrl elsewhere. Modifiers must match
 * exactly, so `'k'` does not fire for Ctrl+K. Ignored during IME composition,
 * and while typing in inputs, textareas, selects, and contenteditable, except
 * Escape. Key names follow `KeyboardEvent.key`, case-insensitive; `esc` and
 * `space` work as aliases.
 *
 * Use when: global shortcuts like a command palette (`mod+k`), closing a
 * modal with Escape, or `/` to focus search.
 * Don't use when: the shortcut belongs to one focused element; use its
 * `onKeyDown` prop. For text input handling, use the input's own events.
 *
 * Other libraries call this `useKey`, `useKeyPress`, `useHotkeys`.
 *
 * @param hotkey - Modifiers and a key joined by `+`: `ctrl`, `alt`, `shift`, `meta`, `mod`.
 * Separate steps with spaces for a sequence: `'g i'` fires after g then i,
 * each within a second of the previous one.
 * @param handler - Called with the `KeyboardEvent`. Can change every render.
 * @param options - `enabled`, `preventDefault`, `enableInInputs`. All optional.
 *
 * @example
 * useHotkey('mod+k', () => setPaletteOpen(true))
 * useHotkey('Escape', () => setPaletteOpen(false), { enabled: paletteOpen })
 */
export function useHotkey(
  hotkey: string,
  handler: (event: KeyboardEvent) => void,
  options: HotkeyOptions = {},
): void {
  const { enabled = true, preventDefault = true, enableInInputs = false } = options
  const handlerRef = useLatest(handler)

  useEffect(() => {
    if (!enabled) return
    // A single hotkey is a sequence of one step. `step` is the next step to match.
    const steps = hotkey.trim().split(/\s+/)
    let step = 0
    let at = 0
    const listener = (event: KeyboardEvent) => {
      if (event.isComposing) return
      if (!enableInInputs && event.key !== 'Escape' && isTyping(event.target)) return
      // Pressing shift for the next step of a sequence isn't a step.
      if (steps.length > 1 && /^(Shift|Control|Alt|Meta)$/.test(event.key)) return
      if (event.timeStamp - at > SEQUENCE_MS) step = 0
      at = event.timeStamp
      step = matches(steps[step]!, event) ? step + 1 : matches(steps[0]!, event) ? 1 : 0
      if (step < steps.length) return
      step = 0
      if (preventDefault) event.preventDefault()
      handlerRef.current(event)
    }
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [enabled, hotkey, preventDefault, enableInInputs, handlerRef])
}
