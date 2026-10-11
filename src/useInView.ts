import { useState } from 'react'
import { useIsomorphicLayoutEffect } from './internal/useIsomorphicLayoutEffect'

export type InViewOptions = {
  /** Grow or shrink the viewport for the check, like CSS margin. E.g. `'200px'` triggers 200px early. */
  rootMargin?: string
  /** Fraction of the element (0 to 1) that must be visible. Default `0`: any pixel. */
  threshold?: number
  /** Stop observing after the first time the element is in view. Default `false`. */
  once?: boolean
}

/**
 * Whether an element is visible in the viewport, using IntersectionObserver.
 *
 * Returns a callback ref to put on the element. It is `false` on the server,
 * during hydration, and until the observer first reports. Does not re-render
 * on scroll, only when visibility changes.
 *
 * Use when: lazy-loading content or images, loading the next page of an
 * infinite list, starting an animation or video when it scrolls into view, or
 * tracking impressions.
 * Don't use when: you need the exact scroll position; use `useWindowScroll`.
 * For images alone, `<img loading="lazy">` needs no JS.
 *
 * Other libraries call this `useIntersection`, `useIntersectionObserver`, `useInViewport`.
 *
 * @param options - `rootMargin`, `threshold`, and `once`. All optional.
 * @returns `[ref, inView]`. Pass `ref` to the element's `ref` prop.
 *
 * @example
 * // Load more when the sentinel gets within 300px of the viewport.
 * const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: '300px' })
 * useEffect(() => {
 *   if (inView) loadMore()
 * }, [inView])
 * return <div ref={ref} />
 */
export function useInView<T extends Element = HTMLElement>(
  options: InViewOptions = {},
): [(element: T | null) => void, boolean] {
  const { rootMargin, threshold = 0, once = false } = options
  const [element, setElement] = useState<T | null>(null)
  const [inView, setInView] = useState(false)

  useIsomorphicLayoutEffect(() => {
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        // Dropping below a threshold > 0 still reports isIntersecting, so compare the ratio too.
        const visible = entry.isIntersecting && entry.intersectionRatio >= threshold
        setInView(visible)
        if (visible && once) observer.disconnect()
      },
      rootMargin === undefined ? { threshold } : { rootMargin, threshold },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [element, rootMargin, threshold, once])

  return [setElement, inView]
}
