import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useWindowScroll } from './useWindowScroll'

let renders = 0
const Scroll = () => {
  renders++
  const { x, y } = useWindowScroll()
  return `${x},${y}`
}

const scroll = (x: number, y: number) =>
  act(async () => {
    vi.spyOn(window, 'scrollX', 'get').mockReturnValue(x)
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(y)
    window.dispatchEvent(new Event('scroll'))
  })

describe('useWindowScroll', () => {
  hookMatrix(() => useWindowScroll())

  it('follows scrolling and skips re-renders when the position is unchanged', async () => {
    await scroll(0, 0)
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Scroll)))
    expect(container.textContent).toBe('0,0')

    await scroll(0, 450)
    expect(container.textContent).toBe('0,450')

    const before = renders
    await scroll(0, 450)
    expect(renders).toBe(before)

    await act(async () => root.unmount())
  })
})
