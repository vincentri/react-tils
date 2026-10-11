import { useEffect, useState } from 'react'

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',')

function focusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      el.tabIndex >= 0 &&
      !el.closest('[inert]') &&
      // checkVisibility skips display:none and similar; older browsers treat everything as visible.
      (typeof el.checkVisibility !== 'function' || el.checkVisibility()),
  )
}

/**
 * Keeps keyboard focus inside an element while `active`, e.g. a custom modal
 * or drawer. Returns a callback ref for the element.
 *
 * On activation, focuses the element with `autofocus` inside, else the first
 * focusable element, else the container itself. Tab and Shift+Tab move through
 * the focusable elements in DOM order and wrap around, the same in every
 * browser (Safari otherwise skips buttons). If focus moves outside (e.g. a click elsewhere), it is brought back.
 * On deactivation or unmount, focus returns to the element that had it before,
 * usually the button that opened the dialog.
 *
 * Use when: a custom modal, drawer, or full-screen menu that you can't build
 * with `<dialog>`.
 * Don't use when: you can use `<dialog>` with `showModal()`; it traps focus,
 * restores it, closes on Escape, and makes the rest of the page inert, with no
 * JS. A focus trap alone doesn't hide the page from screen readers: also set
 * `aria-modal="true"` on the dialog, or `inert` on the rest of the page.
 *
 * @param active - Trap focus while `true`. Default `true`.
 * @returns A callback ref. Pass it to the container's `ref` prop.
 *
 * @example
 * function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
 *   const ref = useFocusTrap<HTMLDivElement>(open)
 *   useHotkey('Escape', onClose, { enabled: open })
 *   if (!open) return null
 *   return (
 *     <div ref={ref} role="dialog" aria-modal="true" aria-label="Menu">
 *       <button onClick={onClose}>Close</button>
 *       <nav>…</nav>
 *     </div>
 *   )
 * }
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  active = true,
): (element: T | null) => void {
  const [container, setContainer] = useState<T | null>(null)

  useEffect(() => {
    if (!active || !container) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusFirst = () => {
      const target =
        container.querySelector<HTMLElement>('[autofocus]') ?? focusables(container)[0] ?? container
      if (target === container && !container.hasAttribute('tabindex'))
        container.setAttribute('tabindex', '-1')
      target.focus()
    }
    if (!container.contains(document.activeElement)) focusFirst()

    // Move focus ourselves on every Tab: browsers disagree on what is tabbable (Safari skips
    // buttons by default), and focus that leaves the page fires no focusin to catch.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      event.preventDefault()
      const items = focusables(container)
      if (items.length === 0) return
      const index = items.indexOf(document.activeElement as HTMLElement)
      const next = event.shiftKey
        ? (items[index - 1] ?? items[items.length - 1]!)
        : (items[index + 1] ?? items[0]!)
      next.focus()
    }
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !container.contains(event.target)) focusFirst()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
      if (previous?.isConnected) previous.focus()
    }
  }, [active, container])

  return setContainer
}
