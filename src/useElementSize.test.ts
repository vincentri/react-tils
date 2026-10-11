import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeObserver } from './test/observers'
import { componentMatrix } from './testing'
import { useElementSize } from './useElementSize'

let lastSize: unknown
const Box = () => {
  const [ref, size] = useElementSize<HTMLDivElement>()
  lastSize = size
  return createElement('div', { ref, id: 'box' }, `${size.width}x${size.height}`)
}

afterEach(() => vi.unstubAllGlobals())

const BorderBox = () => {
  const [ref, size] = useElementSize<HTMLDivElement>({ box: 'border-box' })
  return createElement('div', { ref, id: 'box' }, `${size.width}x${size.height}`)
}

describe('useElementSize', () => {
  componentMatrix(Box)

  it('reports resizes, keeps the same object for unchanged sizes, and disconnects on unmount', async () => {
    const ro = fakeObserver('ResizeObserver')
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Box)))
    expect(container.textContent).toBe('0x0')
    const box = container.querySelector('#box')!

    await act(async () => ro.fire(box, { contentRect: { width: 320, height: 200 } }))
    expect(container.textContent).toBe('320x200')

    // Same size: same object, so consumers' memos and effects don't re-run.
    const before = lastSize
    await act(async () => ro.fire(box, { contentRect: { width: 320, height: 200 } }))
    expect(lastSize).toBe(before)

    await act(async () => root.unmount())
    expect(ro.observedCount()).toBe(0)
  })

  it('measures the border box with { box: "border-box" }', async () => {
    const ro = fakeObserver('ResizeObserver')
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(BorderBox)))
    const box = container.querySelector('#box')!
    expect(ro.instances[0]!.observeOptions).toEqual({ box: 'border-box' })

    await act(async () =>
      ro.fire(box, {
        contentRect: { width: 300, height: 180 },
        borderBoxSize: [{ inlineSize: 322, blockSize: 202 }],
      }),
    )
    expect(container.textContent).toBe('322x202')
    await act(async () => root.unmount())
  })
})
