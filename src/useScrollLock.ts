import { useIsomorphicLayoutEffect } from './internal/useIsomorphicLayoutEffect'

// Shared across components, so nested modals lock once and unlock only when the last closes.
let locks = 0
let saved: { overflow: string; paddingRight: string } | null = null

function lock() {
  if (locks++ > 0) return
  const { body, documentElement } = document
  const scrollbar = window.innerWidth - documentElement.clientWidth
  saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight }
  body.style.overflow = 'hidden'
  // Replace the vanished scrollbar with padding, so the page does not shift sideways.
  if (scrollbar > 0) {
    const padding = Number.parseFloat(getComputedStyle(body).paddingRight) || 0
    body.style.paddingRight = `${padding + scrollbar}px`
  }
}

function unlock() {
  if (--locks > 0 || !saved) return
  Object.assign(document.body.style, saved)
  saved = null
}

/**
 * Stops the page from scrolling while `locked` is `true`, e.g. behind a modal.
 *
 * Sets `overflow: hidden` on `<body>` and pads it by the scrollbar width so the
 * layout does not shift. Locks are counted, so nested modals work: the page
 * unlocks when the last one releases. Restores the original styles. Applied in
 * a layout effect, so there is no frame where the page can scroll.
 *
 * Use when: a modal, drawer, or full-screen menu is open.
 * Don't use when: you use the native `<dialog>` with `showModal()`, where CSS
 * `body:has(dialog[open]) { overflow: hidden }` is enough. To lock scrolling
 * inside an element, use CSS `overscroll-behavior: contain`.
 *
 * Other libraries call this `useLockBodyScroll`.
 *
 * @param locked - Lock while `true`. Default `true`.
 *
 * @example
 * function Modal({ open, children }: { open: boolean; children: React.ReactNode }) {
 *   useScrollLock(open)
 *   return open ? <div role="dialog" aria-modal="true">{children}</div> : null
 * }
 */
export function useScrollLock(locked = true): void {
  useIsomorphicLayoutEffect(() => {
    if (!locked) return
    lock()
    return unlock
  }, [locked])
}
