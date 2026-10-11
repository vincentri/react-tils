import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useScrollSpy } from './useScrollSpy'

const IDS = ['intro', 'usage', 'api']
const Nav = () => String(useScrollSpy(IDS, { offset: 50 }))
const Missing = () => String(useScrollSpy(['nope', ...IDS]))

// Sections at these page positions; their viewport top is position - scrollY.
const positions: Record<string, number> = { intro: 0, usage: 600, api: 1200 }
let scrollY = 0
let pageHeight = 1500

function page() {
  for (const id of IDS) {
    const el = document.createElement('section')
    el.id = id
    el.getBoundingClientRect = () => ({ top: positions[id]! - scrollY }) as DOMRect
    document.body.append(el)
  }
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY)
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockImplementation(() => pageHeight)
}
const scrollTo = (y: number) =>
  act(async () => {
    scrollY = y
    window.dispatchEvent(new Event('scroll'))
  })

afterEach(() => {
  for (const id of IDS) document.getElementById(id)?.remove()
  scrollY = 0
  pageHeight = 1500
})

describe('useScrollSpy', () => {
  hookMatrix(() => useScrollSpy(IDS))

  it('is null on the server', () => {
    expect(renderToString(createElement(Nav))).toBe('null')
  })

  it('follows the last section past the offset line, and the last section at the bottom', async () => {
    pageHeight = 5000 // tall page: the bottom rule doesn't apply until the end
    page()
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Nav)))
    expect(container.textContent).toBe('intro') // top 0 <= offset line

    await scrollTo(548) // usage at 52: not past the 50px line (1px tolerance) yet
    expect(container.textContent).toBe('intro')
    await scrollTo(550)
    expect(container.textContent).toBe('usage')
    await scrollTo(1300)
    expect(container.textContent).toBe('api')

    // A short last section never reaches the line: at the bottom of the page it's active anyway.
    pageHeight = 1500
    await scrollTo(400)
    expect(container.textContent).toBe('intro')
    await scrollTo(700) // 700 + 800 >= 1500: bottom
    expect(container.textContent).toBe('api')
    await act(async () => root.unmount())
  })

  it('is null before the first section, and ignores ids that are not in the page', async () => {
    page()
    positions.intro = 100
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Missing)))
    expect(container.textContent).toBe('null')
    positions.intro = 0
    await act(async () => root.unmount())
  })
})
