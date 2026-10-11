import { useCallback, useRef, useState } from 'react'
import { observeContent } from './internal/observeContent'
import { useIsomorphicLayoutEffect } from './internal/useIsomorphicLayoutEffect'

const UP_KEYS = new Set(['ArrowUp', 'PageUp', 'Home'])

export type StickToBottom = {
  /** Following new content. `false` after the user scrolls up; `true` again at the bottom. */
  atBottom: boolean
  /** Scroll to the bottom and follow new content again. Default behavior `'smooth'`. */
  scrollToBottom: (behavior?: ScrollBehavior) => void
}

/**
 * Keeps a scrollable element scrolled to the bottom as content is added or
 * grows, like a chat or a log, until the user scrolls up to read. Scrolling
 * back to the bottom, or calling `scrollToBottom`, follows again.
 *
 * Follows content that grows with no scroll event, such as an AI reply
 * streamed into the last message. Starts at the bottom. Only scrolling up
 * stops following (wheel, touch, keys, or scrollbar), and it stops as soon as
 * the user starts, so it never cancels their scroll. Its own scrolling never
 * counts as the user's.
 *
 * Use when: a chat, AI chat, terminal output, or live log.
 * Don't use when: new items appear at the top (a feed). Loading older
 * messages above doesn't need it either, but Safari has no scroll anchoring,
 * so there the view jumps unless you restore the position yourself: after
 * prepending, add the change in `scrollHeight` to `scrollTop`. For only reading the scroll position, use
 * `useElementScroll`.
 *
 * Other libraries call this `useAutoScroll`, `useChatScroll`.
 *
 * @returns `[ref, { atBottom, scrollToBottom }]`. Pass `ref` to the scrollable
 * element (with `overflow: auto` and a fixed or max height).
 *
 * @example
 * const [ref, { atBottom, scrollToBottom }] = useStickToBottom<HTMLDivElement>()
 * return (
 *   <>
 *     <div ref={ref} style={{ overflowY: 'auto', height: 500 }}>
 *       {messages.map((m) => <Message key={m.id} {...m} />)}
 *     </div>
 *     {!atBottom && <button onClick={() => scrollToBottom()}>Jump to latest</button>}
 *   </>
 * )
 */
export function useStickToBottom<T extends HTMLElement = HTMLElement>(): [
  (element: T | null) => void,
  StickToBottom,
] {
  const [element, setElement] = useState<T | null>(null)
  const [atBottom, setAtBottom] = useState(true)
  // Read by listeners, so it's a ref; the state copy is for rendering.
  const sticking = useRef(true)

  const stick = useCallback((value: boolean) => {
    if (sticking.current === value) return
    sticking.current = value
    setAtBottom(value)
  }, [])

  useIsomorphicLayoutEffect(() => {
    if (!element) return
    let lastTop = element.scrollTop
    const distance = () => element.scrollHeight - element.clientHeight - element.scrollTop
    const onScroll = () => {
      const top = element.scrollTop
      // Follow again only when this scroll moved down to the bottom: a stale scroll event from our
      // own scrolling can arrive after the user started scrolling up (WebKit scrolls async).
      if (distance() <= 1) {
        if (top > lastTop) stick(true)
      }
      // Only the user scrolls up: following content and scrollToBottom only scroll down.
      else if (top < lastTop) stick(false)
      lastTop = top
    }
    // Instant, so it keeps up with streaming text. Also runs on start: starts at the bottom.
    const onContent = () => {
      // The user scrolled up but its scroll event hasn't fired yet: don't pull them back down.
      // (Content that shrinks also moves scrollTop up, but leaves it at the bottom.)
      if (element.scrollTop < lastTop && distance() > 1) stick(false)
      if (sticking.current) element.scrollTop = element.scrollHeight
      lastTop = element.scrollTop
    }
    // Intent to scroll up, before scrollTop moves: smooth wheel and key scrolling animate over
    // several frames, and following new content in between would cancel the user's scroll.
    let touchY = 0
    // Only when there is somewhere to go: a wheel over short content scrolls nothing.
    const scrollUp = () => {
      if (element.scrollTop > 0) stick(false)
    }
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) scrollUp()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (UP_KEYS.has(event.key) || (event.key === ' ' && event.shiftKey)) scrollUp()
    }
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? 0
    }
    const onTouchMove = (event: TouchEvent) => {
      // Finger moving down scrolls the content up.
      if ((event.touches[0]?.clientY ?? 0) > touchY + 5) scrollUp()
    }
    const listeners = [
      ['scroll', onScroll],
      ['wheel', onWheel],
      ['keydown', onKeyDown],
      ['touchstart', onTouchStart],
      ['touchmove', onTouchMove],
    ] as const
    for (const [type, listener] of listeners)
      element.addEventListener(type, listener as EventListener, { passive: true })
    const stop = observeContent(element, onContent)
    return () => {
      for (const [type, listener] of listeners)
        element.removeEventListener(type, listener as EventListener)
      stop()
    }
  }, [element, stick])

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      if (!element) return
      stick(true)
      element.scrollTo({ top: element.scrollHeight, behavior })
    },
    [element, stick],
  )

  return [setElement, { atBottom, scrollToBottom }]
}
