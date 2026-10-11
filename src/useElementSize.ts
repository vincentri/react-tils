import { useState } from 'react'
import { useIsomorphicLayoutEffect } from './internal/useIsomorphicLayoutEffect'

export type ElementSize = { width: number; height: number }

export type ElementSizeOptions = {
  /** `'content-box'` (default) excludes padding and border; `'border-box'` includes them. */
  box?: 'content-box' | 'border-box'
}

const ZERO: ElementSize = { width: 0, height: 0 }

function measure(entry: ResizeObserverEntry, box: ElementSizeOptions['box']): ElementSize {
  if (box !== 'border-box') return entry.contentRect
  const { inlineSize, blockSize } = entry.borderBoxSize[0]!
  // Inline and block sizes follow the writing direction: swap them for vertical text.
  return getComputedStyle(entry.target).writingMode.startsWith('vertical')
    ? { width: blockSize, height: inlineSize }
    : { width: inlineSize, height: blockSize }
}

/**
 * An element's size in CSS pixels, updated whenever it resizes. By default the
 * content box (excluding padding and border); pass `{ box: 'border-box' }` to
 * include them, e.g. to match `getBoundingClientRect()` without transforms.
 *
 * Returns a callback ref to put on the element. The size is `{ width: 0,
 * height: 0 }` on the server and until the element is measured. Measurement
 * starts in a layout effect, so in the browser the real size is usually ready
 * before the first paint.
 *
 * Use when: JS needs an element's pixel size, e.g. sizing a canvas or chart to
 * its container, or choosing how many items fit in a row.
 * Don't use when: only styles depend on the size; use CSS container queries,
 * which need no JS. For the window, use `useWindowSize`.
 *
 * Other libraries call this `useMeasure`, `useSize`, `useResizeObserver`.
 *
 * @param options - `box`: which box to measure. Default `'content-box'`.
 * @returns `[ref, size]`. Pass `ref` to the element's `ref` prop.
 *
 * @example
 * const [ref, { width, height }] = useElementSize<HTMLDivElement>()
 * return (
 *   <div ref={ref} style={{ height: 300 }}>
 *     <Chart width={width} height={height} />
 *   </div>
 * )
 */
export function useElementSize<T extends Element = HTMLElement>(
  options: ElementSizeOptions = {},
): [(element: T | null) => void, ElementSize] {
  const [element, setElement] = useState<T | null>(null)
  const [size, setSize] = useState(ZERO)
  const { box } = options

  useIsomorphicLayoutEffect(() => {
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = measure(entry, box)
      // Keep the same object when unchanged, so consumers don't re-render.
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    })
    observer.observe(element, { box: box ?? 'content-box' })
    return () => observer.disconnect()
  }, [element, box])

  return [setElement, size]
}
