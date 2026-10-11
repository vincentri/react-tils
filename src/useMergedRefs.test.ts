import { act, createElement, createRef, type Ref, version } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { componentMatrix } from './testing'
import { useElementSize } from './useElementSize'
import { useInView } from './useInView'
import { useMergedRefs } from './useMergedRefs'

type Callback = (el: HTMLDivElement | null) => void
const Box = ({ refs }: { refs: Ref<HTMLDivElement>[] }) =>
  createElement('div', { ref: useMergedRefs(...refs), id: 'box' })

// Two hook refs on one element: the case the hook exists for.
const WithHooks = () => {
  const [inViewRef, inView] = useInView<HTMLDivElement>()
  const [sizeRef, { width }] = useElementSize<HTMLDivElement>()
  return createElement('div', { ref: useMergedRefs(inViewRef, sizeRef) }, `${inView} ${width}`)
}

describe('useMergedRefs', () => {
  componentMatrix(WithHooks)

  it('sets ref objects and callback refs, and clears them on unmount', async () => {
    const object = createRef<HTMLDivElement>()
    const callback = vi.fn<Callback>()
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Box, { refs: [object, callback, null] })))
    expect(object.current?.id).toBe('box')
    expect(callback).toHaveBeenLastCalledWith(object.current)

    await act(async () => root.unmount())
    expect(object.current).toBeNull()
    expect(callback).toHaveBeenLastCalledWith(null)
  })

  it.skipIf(version.startsWith('18'))(
    "React 19: runs a callback ref's cleanup instead of calling it with null",
    async () => {
      const cleanup = vi.fn<() => void>()
      const withCleanup = vi.fn<(el: HTMLDivElement | null) => () => void>(() => cleanup)
      const root = createRoot(document.createElement('div'))
      await act(async () => root.render(createElement(Box, { refs: [withCleanup] })))
      await act(async () => root.unmount())
      expect(cleanup).toHaveBeenCalledTimes(1)
      expect(withCleanup).toHaveBeenCalledTimes(1)
    },
  )

  it('keeps the merged ref while the refs are the same, and switches when one changes', async () => {
    const object = createRef<HTMLDivElement>()
    const first = vi.fn<Callback>()
    const second = vi.fn<Callback>()
    const root = createRoot(document.createElement('div'))
    const render = (refs: Ref<HTMLDivElement>[]) =>
      act(async () => root.render(createElement(Box, { refs })))

    await render([object, first])
    await render([object, first])
    expect(first).toHaveBeenCalledTimes(1)

    await render([object, second])
    expect(first).toHaveBeenLastCalledWith(null)
    expect(second).toHaveBeenLastCalledWith(object.current)
    expect(object.current?.id).toBe('box')
    await act(async () => root.unmount())
  })
})
