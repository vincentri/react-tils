import { useState } from 'react'
import { useIsomorphicLayoutEffect } from './internal/useIsomorphicLayoutEffect'

/**
 * Whether a `position: sticky` element is currently stuck to the top of the
 * viewport. Returns a callback ref for the sticky element.
 *
 * Reads the element's own CSS `top` and watches it with an
 * IntersectionObserver, so it costs nothing while scrolling and needs no
 * extra markup. `false` on the server and until the element is measured.
 *
 * Use when: adding a shadow or border to a sticky header only once it sticks,
 * or shrinking a sticky toolbar.
 * Don't use when: the sticky element sticks inside a scroll container rather
 * than the page; this watches the viewport. If you only need the element to
 * stick, CSS `position: sticky` alone is enough.
 *
 * Other libraries call this `useSticky`, `useStickyFixed`.
 *
 * @returns `[ref, stuck]`. Pass `ref` to the sticky element.
 *
 * @example
 * const [ref, stuck] = useIsStuck<HTMLElement>()
 * return (
 *   <header ref={ref} style={{ position: 'sticky', top: 0 }} className={stuck ? 'shadow' : ''}>
 *     …
 *   </header>
 * )
 */
export function useIsStuck<T extends Element = HTMLElement>(): [
  (element: T | null) => void,
  boolean,
] {
  const [element, setElement] = useState<T | null>(null)
  const [stuck, setStuck] = useState(false)

  useIsomorphicLayoutEffect(() => {
    if (!element) return
    const top = Number.parseFloat(getComputedStyle(element).top) || 0
    // Shrink the viewport by one pixel below the sticky line: a stuck element's top pixel falls
    // outside it, so it is no longer fully visible.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        const { top: rectTop, bottom } = entry.boundingClientRect
        setStuck(entry.intersectionRatio < 1 && rectTop <= top + 1 && bottom > top)
      },
      { rootMargin: `${-(top + 1)}px 0px 0px 0px`, threshold: [0, 1] },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return [setElement, stuck]
}
