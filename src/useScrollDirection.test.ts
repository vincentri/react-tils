import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useScrollDirection } from './useScrollDirection'

let renders = 0
const Direction = () => {
  renders++
  return useScrollDirection(10)
}

const scrollTo = (y: number) =>
  act(async () => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(y)
    window.dispatchEvent(new Event('scroll'))
  })

describe('useScrollDirection', () => {
  hookMatrix(() => useScrollDirection())

  it('flips on real movement, ignores jitter, re-renders only on flips, and is up at the top', async () => {
    await scrollTo(0)
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Direction)))
    expect(container.textContent).toBe('up')

    await scrollTo(100)
    expect(container.textContent).toBe('down')
    const before = renders
    await scrollTo(200)
    await scrollTo(300)
    expect(renders).toBe(before)

    await scrollTo(295) // jitter below the threshold
    expect(container.textContent).toBe('down')
    await scrollTo(250)
    expect(container.textContent).toBe('up')

    await scrollTo(400)
    expect(container.textContent).toBe('down')
    await scrollTo(0)
    expect(container.textContent).toBe('up')
    await act(async () => root.unmount())
  })
})
