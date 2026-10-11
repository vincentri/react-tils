// happy-dom has no layout: give an element a fake scroll geometry. scrollTop clamps like a browser,
// also when the content shrinks.
type ScrollSize = { scrollHeight: number; clientHeight: number }

export function fakeScroll(
  el: Element,
  size: ScrollSize,
): { size: ScrollSize; scrollTo: (value: number) => void } {
  let top = 0
  const max = () => Math.max(0, size.scrollHeight - size.clientHeight)
  Object.defineProperties(el, {
    scrollHeight: { configurable: true, get: () => size.scrollHeight },
    clientHeight: { configurable: true, get: () => size.clientHeight },
    scrollTop: {
      configurable: true,
      get: () => Math.min(top, max()),
      set: (value: number) => {
        top = Math.min(Math.max(value, 0), max())
      },
    },
    scrollTo: {
      configurable: true,
      value: (options: ScrollToOptions) => {
        top = Math.min(Math.max(options.top ?? top, 0), max())
      },
    },
  })
  return {
    size,
    /** Scroll like a user: move scrollTop, then fire the scroll event. */
    scrollTo(value: number) {
      ;(el as { scrollTop: number }).scrollTop = value
      el.dispatchEvent(new Event('scroll'))
    },
  }
}
