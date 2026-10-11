import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { type IntervalOptions, useInterval } from './useInterval'

type Props = { onTick: () => void; delay: number | null; options?: IntervalOptions }
const Ticker = ({ onTick, delay, options }: Props) => {
  useInterval(onTick, delay, options)
  return null
}

async function mount(props: Props) {
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Ticker, props)))
  return {
    rerender: (next: Props) => act(async () => root.render(createElement(Ticker, next))),
    unmount: () => act(async () => root.unmount()),
  }
}
const advance = (ms: number) => act(async () => vi.advanceTimersByTime(ms))

describe('useInterval', () => {
  hookMatrix(() => useInterval(() => {}, 1000))

  describe('with fake timers', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('ticks, calls the latest callback without restarting, pauses on null, and clears on unmount', async () => {
      const first = vi.fn<() => void>()
      const second = vi.fn<() => void>()
      const view = await mount({ onTick: first, delay: 100 })
      await advance(250)
      expect(first).toHaveBeenCalledTimes(2)

      await view.rerender({ onTick: second, delay: 100 })
      await advance(50) // same timer: 300ms total, third tick
      expect(second).toHaveBeenCalledTimes(1)

      await view.rerender({ onTick: second, delay: null })
      await advance(1000)
      expect(second).toHaveBeenCalledTimes(1)

      await view.rerender({ onTick: second, delay: 100 })
      await view.unmount()
      expect(vi.getTimerCount()).toBe(0)
    })

    it('pauses while the tab is hidden with pauseWhenHidden', async () => {
      const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
      const onTick = vi.fn<() => void>()
      const view = await mount({ onTick, delay: 100, options: { pauseWhenHidden: true } })
      await advance(100)
      expect(onTick).toHaveBeenCalledTimes(1)

      visibility.mockReturnValue('hidden')
      await act(async () => document.dispatchEvent(new Event('visibilitychange')))
      await advance(500)
      expect(onTick).toHaveBeenCalledTimes(1)

      visibility.mockReturnValue('visible')
      await act(async () => document.dispatchEvent(new Event('visibilitychange')))
      await advance(100)
      expect(onTick).toHaveBeenCalledTimes(2)
      await view.unmount()
    })
  })
})
