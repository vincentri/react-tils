import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useLongPress } from './useLongPress'

const Item = ({ onLongPress, onClick }: { onLongPress: () => void; onClick: () => void }) => {
  const longPress = useLongPress(onLongPress, { delayMs: 500 })
  return createElement('button', { ...longPress, onClick, id: 'item' })
}

const pointer = (el: Element, type: string, init: PointerEventInit = {}) =>
  act(async () => {
    el.dispatchEvent(
      new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, ...init }),
    )
  })
const advance = (ms: number) => act(async () => vi.advanceTimersByTime(ms))

async function mount() {
  const onLongPress = vi.fn<() => void>()
  const onClick = vi.fn<() => void>()
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(createElement(Item, { onLongPress, onClick })))
  return {
    onLongPress,
    onClick,
    item: container.querySelector('#item')!,
    unmount: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

describe('useLongPress', () => {
  hookMatrix(() => Object.keys(useLongPress(() => {})).length)

  describe('with fake timers', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('fires after the delay and swallows the click that follows', async () => {
      const view = await mount()
      await pointer(view.item, 'pointerdown')
      await advance(499)
      expect(view.onLongPress).not.toHaveBeenCalled()
      await advance(1)
      expect(view.onLongPress).toHaveBeenCalledTimes(1)
      await pointer(view.item, 'pointerup')
      await act(async () => (view.item as HTMLElement).click())
      expect(view.onClick).not.toHaveBeenCalled()

      // A normal short click still works.
      await pointer(view.item, 'pointerdown')
      await advance(100)
      await pointer(view.item, 'pointerup')
      await act(async () => (view.item as HTMLElement).click())
      expect(view.onClick).toHaveBeenCalledTimes(1)
      await view.unmount()
    })

    it('cancels on release, on moving past the tolerance, and for non-primary buttons', async () => {
      const view = await mount()
      await pointer(view.item, 'pointerdown')
      await advance(200)
      await pointer(view.item, 'pointerup')
      await advance(500)

      await pointer(view.item, 'pointerdown', { clientX: 0, clientY: 0 })
      await pointer(view.item, 'pointermove', { clientX: 0, clientY: 30 }) // scrolling
      await advance(600)

      await pointer(view.item, 'pointerdown', { button: 2 })
      await advance(600)
      expect(view.onLongPress).not.toHaveBeenCalled()

      await pointer(view.item, 'pointerdown')
      await view.unmount()
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
