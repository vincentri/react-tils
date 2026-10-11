import { act, createElement, type ReactElement, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { type EventListenerTarget, useEventListener } from './useEventListener'

async function render(element: ReactElement) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(element))
  return {
    container,
    rerender: (next: ReactElement) => act(async () => root.render(next)),
    unmount: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

type Props = { target: EventListenerTarget; onEvent: (e: Event) => void; capture?: boolean }
const Listener = ({ target, onEvent, capture = false }: Props) => {
  useEventListener(target, 'custom', onEvent, { capture })
  return null
}

describe('useEventListener', () => {
  hookMatrix(() => useEventListener('window', 'resize', () => {}))
  hookMatrix(() => useEventListener('document', 'keydown', () => {}))

  it('calls the latest handler without re-subscribing', async () => {
    const add = vi.spyOn(window, 'addEventListener')
    const first = vi.fn<(e: Event) => void>()
    const second = vi.fn<(e: Event) => void>()
    const view = await render(createElement(Listener, { target: 'window', onEvent: first }))
    await view.rerender(createElement(Listener, { target: 'window', onEvent: second }))
    window.dispatchEvent(new Event('custom'))
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    expect(add.mock.calls.filter(([type]) => type === 'custom')).toHaveLength(1)
    await view.unmount()
    window.dispatchEvent(new Event('custom'))
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('listens on a ref, and does nothing for null', async () => {
    const onRef = vi.fn<(e: Event) => void>()
    const WithRef = () => {
      const ref = useRef<HTMLButtonElement>(null)
      useEventListener(ref, 'custom', onRef)
      // oxlint-disable-next-line react/refs -- this is the JSX `ref` prop, written without JSX
      return createElement('button', { ref, id: 'target' })
    }
    const view = await render(createElement(WithRef))
    view.container.querySelector('#target')!.dispatchEvent(new Event('custom'))
    expect(onRef).toHaveBeenCalledTimes(1)
    await view.unmount()

    const onNull = vi.fn<(e: Event) => void>()
    const nullView = await render(createElement(Listener, { target: null, onEvent: onNull }))
    window.dispatchEvent(new Event('custom'))
    expect(onNull).not.toHaveBeenCalled()
    await nullView.unmount()
  })

  it('removes a capture listener with the matching capture flag', async () => {
    const remove = vi.spyOn(document, 'removeEventListener')
    const view = await render(
      createElement(Listener, { target: 'document', onEvent: () => {}, capture: true }),
    )
    await view.unmount()
    expect(remove).toHaveBeenCalledWith('custom', expect.any(Function), { capture: true })
  })
})
