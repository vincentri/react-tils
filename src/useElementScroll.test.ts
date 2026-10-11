import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeObserver } from './test/observers'
import { fakeScroll } from './test/scroll'
import { componentMatrix } from './testing'
import { type ElementScroll, useElementScroll } from './useElementScroll'

let last: ElementScroll
const Panel = () => {
  const [ref, scroll] = useElementScroll<HTMLDivElement>()
  last = scroll
  return createElement('div', { ref, id: 'panel' }, createElement('p', null, 'rows'))
}

afterEach(() => vi.unstubAllGlobals())

describe('useElementScroll', () => {
  componentMatrix(Panel)

  it('follows scrolling and content growth, keeps the same object when unchanged, and stops on unmount', async () => {
    const ro = fakeObserver('ResizeObserver')
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Panel)))
    const panel = container.querySelector('#panel')!
    const scroll = fakeScroll(panel, { scrollHeight: 1000, clientHeight: 200 })

    await act(async () => scroll.scrollTo(0))
    expect(last).toMatchObject({ y: 0, atTop: true, atBottom: false })

    await act(async () => scroll.scrollTo(799.5)) // fractional: still counts as the bottom
    expect(last).toMatchObject({ y: 799.5, atTop: false, atBottom: true })

    const before = last
    await act(async () => panel.dispatchEvent(new Event('scroll')))
    expect(last).toBe(before)

    // Content grows with no scroll event: atBottom must not go stale.
    scroll.size.scrollHeight = 1400
    await act(async () => ro.fire(panel.firstElementChild!, {}))
    expect(last.atBottom).toBe(false)

    await act(async () => root.unmount())
    expect(ro.observedCount()).toBe(0)
  })

  it('observes children added later', async () => {
    const ro = fakeObserver('ResizeObserver')
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Panel)))
    const panel = container.querySelector('#panel')!
    const added = document.createElement('p')
    await act(async () => panel.append(added))
    expect(ro.instances.some((i) => i.observed.has(added))).toBe(true)
    await act(async () => root.unmount())
  })
})
