import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeObserver } from './test/observers'
import { componentMatrix } from './testing'
import { useIsStuck } from './useIsStuck'

const Header = () => {
  const [ref, stuck] = useIsStuck<HTMLElement>()
  return createElement('header', { ref, id: 'header', style: { top: '8px' } }, String(stuck))
}

afterEach(() => vi.unstubAllGlobals())

describe('useIsStuck', () => {
  componentMatrix(Header)

  it('watches the sticky line from the CSS top, and reports stuck only while pinned there', async () => {
    const io = fakeObserver('IntersectionObserver')
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    await act(async () => root.render(createElement(Header)))
    const header = container.querySelector('#header')!
    expect(container.textContent).toBe('false')
    expect(io.instances[0]!.options).toMatchObject({ rootMargin: '-9px 0px 0px 0px' })

    const fire = (intersectionRatio: number, top: number, bottom: number) =>
      act(async () => io.fire(header, { intersectionRatio, boundingClientRect: { top, bottom } }))

    await fire(0.98, 8, 48) // pinned at top: 8px, its top pixel is past the line
    expect(container.textContent).toBe('true')
    await fire(1, 120, 160) // back in the flow below the line
    expect(container.textContent).toBe('false')
    await fire(0.5, 700, 740) // half below the bottom of the viewport: not stuck
    expect(container.textContent).toBe('false')
    await fire(0, -60, -20) // scrolled away above with its container
    expect(container.textContent).toBe('false')

    await act(async () => root.unmount())
    expect(io.observedCount()).toBe(0)
    container.remove()
  })
})
