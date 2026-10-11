import { useSyncExternalStore } from 'react'

export type WindowScroll = { x: number; y: number }

const SERVER_SCROLL: WindowScroll = { x: 0, y: 0 }
let cached: WindowScroll = SERVER_SCROLL

function subscribe(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true })
  return () => window.removeEventListener('scroll', onChange)
}

// Same object until the position changes, so unchanged scroll events don't re-render.
function getScroll(): WindowScroll {
  const { scrollX: x, scrollY: y } = window
  if (x !== cached.x || y !== cached.y) cached = { x, y }
  return cached
}

/**
 * The window's scroll position in CSS pixels, updated on scroll.
 *
 * Renders `serverValue` on the server and during hydration, then switches to the
 * real position with no hydration mismatch. Re-renders on every scroll event
 * that moves the page (not throttled).
 *
 * Use when: JS needs the scroll position, e.g. a "back to top" button after
 * scrolling down, or parallax that depends on the exact offset.
 * Don't use when: you only need to know if an element is visible; use
 * `useInView`, which does not re-render on every scroll. For a header that
 * hides on scroll down, use `useScrollDirection`; for a reading progress bar,
 * `useScrollProgress`; both re-render far less. For sticky
 * elements, use CSS `position: sticky`. For scroll-linked animation, use CSS
 * scroll-driven animations.
 *
 * @param serverValue - Position on the server and during hydration. Default
 * `{ x: 0, y: 0 }`. Pass a constant, not an inline object.
 *
 * @example
 * const { y } = useWindowScroll()
 * return y > 400 ? <button onClick={() => window.scrollTo({ top: 0 })}>Top</button> : null
 */
export function useWindowScroll(serverValue: WindowScroll = SERVER_SCROLL): WindowScroll {
  return useSyncExternalStore(subscribe, getScroll, () => serverValue)
}
