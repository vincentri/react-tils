import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { type VisualViewportState, useVisualViewport } from './useVisualViewport'

let state: VisualViewportState
const Viewport = () => {
  state = useVisualViewport()
  return null
}

function fakeViewport(height: number) {
  const viewport = Object.assign(new EventTarget(), {
    width: 390,
    height,
    offsetTop: 0,
    offsetLeft: 0,
    scale: 1,
  })
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(844)
  return viewport
}

afterEach(() => {
  Reflect.deleteProperty(window, 'visualViewport')
})

describe('useVisualViewport', () => {
  hookMatrix(() => useVisualViewport())

  it('reports the keyboard as bottomInset and keeps the same object when unchanged', async () => {
    const viewport = fakeViewport(844)
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Viewport)))
    expect(state).toMatchObject({ width: 390, height: 844, bottomInset: 0 })

    viewport.height = 508 // keyboard opened
    await act(async () => viewport.dispatchEvent(new Event('resize')))
    expect(state.bottomInset).toBe(336)

    const before = state
    await act(async () => viewport.dispatchEvent(new Event('scroll')))
    expect(state).toBe(before)
    await act(async () => root.unmount())
  })
})
