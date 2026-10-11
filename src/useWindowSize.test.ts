import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { hookMatrix } from './testing'
import { useWindowSize } from './useWindowSize'

let renders = 0
const Size = () => {
  renders++
  const { width, height } = useWindowSize()
  return `${width}x${height}`
}

const resize = (width: number, height: number) =>
  act(async () => {
    Object.assign(window, { innerWidth: width, innerHeight: height })
    window.dispatchEvent(new Event('resize'))
  })

describe('useWindowSize', () => {
  hookMatrix(() => useWindowSize())

  it('follows resizes and skips re-renders when the size is unchanged', async () => {
    await resize(1024, 768)
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Size)))
    expect(container.textContent).toBe('1024x768')

    await resize(500, 400)
    expect(container.textContent).toBe('500x400')

    const before = renders
    await resize(500, 400)
    expect(renders).toBe(before)

    await act(async () => root.unmount())
  })
})
