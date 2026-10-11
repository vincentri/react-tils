import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeObserver } from './test/observers'
import { componentMatrix } from './testing'
import { useScrollProgress } from './useScrollProgress'

let progress: number
const Article = () => {
  const [ref, value] = useScrollProgress<HTMLElement>()
  progress = value
  return createElement('article', { ref, id: 'article' })
}

afterEach(() => vi.unstubAllGlobals())

describe('useScrollProgress', () => {
  componentMatrix(Article)

  it('goes from 0 at the top of the element to 1 at its bottom, and follows size changes', async () => {
    const ro = fakeObserver('ResizeObserver')
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Article)))
    const article = container.querySelector('#article')!
    let rect = { top: 100, height: 2800, bottom: 2900 }
    article.getBoundingClientRect = () => rect as DOMRect
    const scrollTo = (top: number) =>
      act(async () => {
        rect = { top, height: rect.height, bottom: top + rect.height }
        window.dispatchEvent(new Event('scroll'))
      })

    await act(async () => ro.fire(article, {})) // measured on start
    expect(progress).toBe(0)
    await scrollTo(-1000) // 1000 of the 2000 scrollable pixels
    expect(progress).toBe(0.5)
    await scrollTo(-3000)
    expect(progress).toBe(1)

    // Images load and the article grows: no scroll event, but the progress changes.
    await act(async () => {
      rect = { top: -1000, height: 4800, bottom: 3800 }
      ro.fire(article, {})
    })
    expect(progress).toBe(0.25)
    await act(async () => root.unmount())
    expect(ro.observedCount()).toBe(0)
  })

  it('counts an element shorter than the viewport as read once it is fully visible', async () => {
    const ro = fakeObserver('ResizeObserver')
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Article)))
    const article = container.querySelector('#article')!
    article.getBoundingClientRect = () => ({ top: 700, height: 300, bottom: 1000 }) as DOMRect
    await act(async () => ro.fire(article, {}))
    expect(progress).toBe(0)
    article.getBoundingClientRect = () => ({ top: 400, height: 300, bottom: 700 }) as DOMRect
    await act(async () => window.dispatchEvent(new Event('scroll')))
    expect(progress).toBe(1)
    await act(async () => root.unmount())
  })
})
