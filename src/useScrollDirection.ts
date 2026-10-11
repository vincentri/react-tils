import { useEffect, useState } from 'react'

export type ScrollDirection = 'up' | 'down'

/**
 * The direction the page last scrolled: `'up'` or `'down'`.
 *
 * Re-renders only when the direction flips, not on every scroll event.
 * Movements smaller than `threshold` pixels are ignored, so small jitters
 * (trackpad bounce, iOS overscroll) don't flip it. Always `'up'` at the top of
 * the page, on the server, and during hydration.
 *
 * Use when: hiding a header while scrolling down and showing it when scrolling
 * up, or showing a "back to top" button only while scrolling up.
 * Don't use when: you need the position itself; use `useWindowScroll`. For a
 * header that just sticks, use CSS `position: sticky`.
 *
 * @param threshold - Ignore movements smaller than this, in pixels. Default `10`.
 *
 * @example
 * const direction = useScrollDirection()
 * return <header className={direction === 'down' ? 'header hidden' : 'header'}>…</header>
 */
export function useScrollDirection(threshold = 10): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>('up')

  useEffect(() => {
    let lastY = window.scrollY
    // Tracked here so setState runs only on a real flip; same-value updates can still render once.
    let current: ScrollDirection = 'up'
    const set = (next: ScrollDirection) => {
      if (next === current) return
      current = next
      setDirection(next)
    }
    const onScroll = () => {
      const y = window.scrollY
      if (y <= 0) {
        lastY = 0
        set('up')
        return
      }
      if (Math.abs(y - lastY) < threshold) return
      set(y > lastY ? 'down' : 'up')
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return direction
}
