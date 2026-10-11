import { useState } from 'react'
import { useIsomorphicLayoutEffect } from './internal/useIsomorphicLayoutEffect'

function progressOf(element: Element): number {
  const rect = element.getBoundingClientRect()
  const range = rect.height - window.innerHeight
  // Shorter than the viewport: read once it's fully on screen.
  if (range <= 0) return rect.bottom <= window.innerHeight ? 1 : 0
  const progress = Math.min(1, Math.max(0, -rect.top / range))
  // Three decimals: smooth enough for a progress bar, without a re-render per pixel.
  return Math.round(progress * 1000) / 1000
}

/**
 * How far the user has scrolled through an element, from `0` (its top at the
 * top of the viewport) to `1` (its bottom at the bottom of the viewport).
 * Returns a callback ref for the element.
 *
 * Updates on page scroll, window resize, and when the element's own size
 * changes (images loading, content added). An element shorter than the
 * viewport counts as read once it is fully visible. `0` on the server and
 * until the element is measured.
 *
 * Use when: a reading-progress bar for an article or docs page, or showing
 * how much of a long form or terms text is left.
 * Don't use when: you want the whole page's progress; use `useWindowScroll`
 * with the page height. For progress inside a scroll container, use
 * `useElementScroll`. For purely visual effects, CSS scroll-driven animations
 * avoid re-renders where supported.
 *
 * Other libraries call this `useReadingProgress`, `useScrollPercentage`.
 *
 * @returns `[ref, progress]`, with `progress` from `0` to `1`.
 *
 * @example
 * const [ref, progress] = useScrollProgress<HTMLElement>()
 * return (
 *   <>
 *     <div className="progress-bar" style={{ transform: `scaleX(${progress})` }} />
 *     <article ref={ref}>…</article>
 *   </>
 * )
 */
export function useScrollProgress<T extends Element = HTMLElement>(): [
  (element: T | null) => void,
  number,
] {
  const [element, setElement] = useState<T | null>(null)
  const [progress, setProgress] = useState(0)

  useIsomorphicLayoutEffect(() => {
    if (!element) return
    const update = () => setProgress(progressOf(element))
    // Measures once on start too: ResizeObserver reports every observed element right away.
    const observer = new ResizeObserver(update)
    observer.observe(element)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [element])

  return [setElement, progress]
}
