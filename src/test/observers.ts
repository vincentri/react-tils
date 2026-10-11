import { vi } from 'vitest'

// happy-dom's observers never fire, so tests drive fakes by hand.

type Fake = {
  callback: (entries: unknown[]) => void
  observed: Set<Element>
  options: unknown
  observeOptions?: unknown
}

export type FakeObserver = {
  instances: Fake[]
  observedCount: () => number
  fire: (el: Element, entry: object) => void
}

export function fakeObserver(name: 'ResizeObserver' | 'IntersectionObserver'): FakeObserver {
  const instances: Fake[] = []
  vi.stubGlobal(
    name,
    class {
      fake: Fake
      constructor(callback: Fake['callback'], options?: unknown) {
        this.fake = { callback, observed: new Set(), options }
        instances.push(this.fake)
      }
      observe(el: Element, observeOptions?: unknown) {
        this.fake.observed.add(el)
        this.fake.observeOptions = observeOptions
      }
      unobserve(el: Element) {
        this.fake.observed.delete(el)
      }
      disconnect() {
        this.fake.observed.clear()
      }
    },
  )
  return {
    instances,
    /** Elements still observed by any instance. */
    observedCount: () => instances.reduce((n, i) => n + i.observed.size, 0),
    /** Deliver an entry to every instance observing `el`. */
    fire(el: Element, entry: object) {
      for (const i of instances) if (i.observed.has(el)) i.callback([{ target: el, ...entry }])
    },
  }
}
