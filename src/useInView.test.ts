import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeObserver } from './test/observers'
import { componentMatrix } from './testing'
import { type InViewOptions, useInView } from './useInView'

const Section = (options: InViewOptions) => {
  const [ref, inView] = useInView<HTMLDivElement>(options)
  return createElement('div', { ref, id: 'section' }, String(inView))
}
const Default = () => Section({})

async function mount(options: InViewOptions = {}) {
  const io = fakeObserver('IntersectionObserver')
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () => root.render(createElement(Section, options)))
  const el = container.querySelector('#section')!
  return {
    io,
    text: () => container.textContent,
    fire: (isIntersecting: boolean, intersectionRatio: number) =>
      act(async () => io.fire(el, { isIntersecting, intersectionRatio })),
    unmount: () => act(async () => root.unmount()),
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('useInView', () => {
  componentMatrix(Default)

  it('follows visibility and disconnects on unmount', async () => {
    const view = await mount()
    expect(view.text()).toBe('false')
    await view.fire(true, 0.5)
    expect(view.text()).toBe('true')
    await view.fire(false, 0)
    expect(view.text()).toBe('false')
    await view.unmount()
    expect(view.io.observedCount()).toBe(0)
  })

  it('passes rootMargin and threshold, and respects the threshold ratio', async () => {
    const view = await mount({ rootMargin: '300px', threshold: 0.5 })
    expect(view.io.instances[0]!.options).toEqual({ rootMargin: '300px', threshold: 0.5 })
    await view.fire(true, 0.6)
    expect(view.text()).toBe('true')
    // Dropped below the threshold but still partly on screen.
    await view.fire(true, 0.3)
    expect(view.text()).toBe('false')
    await view.unmount()
  })

  it('stops observing after the first hit with once', async () => {
    const view = await mount({ once: true })
    await view.fire(true, 1)
    expect(view.text()).toBe('true')
    expect(view.io.observedCount()).toBe(0)
    await view.unmount()
  })
})
