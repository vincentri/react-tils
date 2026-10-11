import { useState } from 'react'
import { observeContent } from './internal/observeContent'
import { useIsomorphicLayoutEffect } from './internal/useIsomorphicLayoutEffect'

export type ElementScroll = {
  /** `scrollLeft`: 0 or negative in right-to-left content, as in the DOM. */
  x: number
  /** `scrollTop`. */
  y: number
  atTop: boolean
  atBottom: boolean
  atLeft: boolean
  atRight: boolean
}

const INITIAL: ElementScroll = {
  x: 0,
  y: 0,
  atTop: true,
  atBottom: true,
  atLeft: true,
  atRight: true,
}

// Within 1px counts as at the edge: zoom and high-DPI screens leave fractional remainders.
function read(el: Element, rtl: boolean, prev: ElementScroll): ElementScroll {
  const { scrollLeft: x, scrollTop: y, scrollWidth, scrollHeight, clientWidth, clientHeight } = el
  const maxX = scrollWidth - clientWidth
  const next = {
    x,
    y,
    atTop: y <= 1,
    atBottom: scrollHeight - clientHeight - y <= 1,
    atLeft: x <= (rtl ? -maxX : 0) + 1,
    atRight: x >= (rtl ? 0 : maxX) - 1,
  }
  const same = (Object.keys(next) as (keyof ElementScroll)[]).every((k) => next[k] === prev[k])
  return same ? prev : next
}

/**
 * The scroll position of a scrollable element, and whether it is at each edge.
 * Returns a callback ref for the element.
 *
 * Updates on scroll, and also when the element or its content changes size
 * with no scroll event (rows added, text streamed in), so `atBottom` never
 * goes stale. Before the element is measured, and on the server, it is at
 * `0, 0` with every edge `true`.
 *
 * Use when: fade shadows at the edges of a scrolling table or list, a "scroll
 * to top" button inside a panel, or "you've read to the end" in a container.
 * Don't use when: the page itself scrolls; use `useWindowScroll`. For a chat
 * that follows new messages, use `useStickToBottom`. Shadows alone can be done
 * with CSS scroll-driven animations where supported.
 *
 * Re-renders as `x` and `y` change, about once a frame while scrolling. If
 * an expensive component only needs the edge flags, call the hook in a small
 * child component instead.
 *
 * Other libraries call this `useScroll`.
 *
 * @returns `[ref, scroll]`. Pass `ref` to the scrollable element.
 *
 * @example
 * const [ref, { atTop, atBottom }] = useElementScroll<HTMLDivElement>()
 * return (
 *   <div ref={ref} style={{ overflow: 'auto', maxHeight: 400 }}
 *     className={[!atTop && 'shadow-top', !atBottom && 'shadow-bottom'].filter(Boolean).join(' ')}>
 *     <Rows />
 *   </div>
 * )
 */
export function useElementScroll<T extends Element = HTMLElement>(): [
  (element: T | null) => void,
  ElementScroll,
] {
  const [element, setElement] = useState<T | null>(null)
  const [scroll, setScroll] = useState(INITIAL)

  useIsomorphicLayoutEffect(() => {
    if (!element) return
    const rtl = getComputedStyle(element).direction === 'rtl'
    const update = () => setScroll((prev) => read(element, rtl, prev))
    element.addEventListener('scroll', update, { passive: true })
    // Also measures once right away: ResizeObserver reports every observed element on start.
    const stop = observeContent(element, update)
    return () => {
      element.removeEventListener('scroll', update)
      stop()
    }
  }, [element])

  return [setElement, scroll]
}
