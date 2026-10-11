import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useTimeout } from './useTimeout'

type Props = { onDone: () => void; delay: number | null }
let restart: () => void
const Timer = ({ onDone, delay }: Props) => {
  restart = useTimeout(onDone, delay)
  return null
}

async function mount(props: Props) {
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Timer, props)))
  return {
    rerender: (next: Props) => act(async () => root.render(createElement(Timer, next))),
    unmount: () => act(async () => root.unmount()),
  }
}
const advance = (ms: number) => act(async () => vi.advanceTimersByTime(ms))

describe('useTimeout', () => {
  hookMatrix(() => useTimeout(() => {}, 1000))

  describe('with fake timers', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('fires once with the latest callback, and cancels on null', async () => {
      const first = vi.fn<() => void>()
      const second = vi.fn<() => void>()
      const view = await mount({ onDone: first, delay: 100 })
      await view.rerender({ onDone: second, delay: 100 }) // same timer
      await advance(100)
      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(1)
      await advance(1000)
      expect(second).toHaveBeenCalledTimes(1)

      await view.rerender({ onDone: second, delay: 200 }) // new delay: starts again
      await view.rerender({ onDone: second, delay: null })
      await advance(1000)
      expect(second).toHaveBeenCalledTimes(1)
      await view.unmount()
    })

    it('restart starts the delay over, and does nothing after unmount', async () => {
      const onDone = vi.fn<() => void>()
      const view = await mount({ onDone, delay: 100 })
      await advance(80)
      act(() => restart())
      await advance(80)
      expect(onDone).not.toHaveBeenCalled()
      await advance(20)
      expect(onDone).toHaveBeenCalledTimes(1)

      await view.unmount()
      restart()
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
