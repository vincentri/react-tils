import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { type ThrottledFunction, useThrottledCallback } from './useThrottledCallback'

let throttled: ThrottledFunction<[number]>
const Slider = (props: { onMove: (x: number) => void; interval?: number }) => {
  throttled = useThrottledCallback(props.onMove, props.interval ?? 100)
  return null
}

async function mount(props: Parameters<typeof Slider>[0]) {
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Slider, props)))
  return {
    rerender: (next: Parameters<typeof Slider>[0]) =>
      act(async () => root.render(createElement(Slider, next))),
    unmount: () => act(async () => root.unmount()),
  }
}

describe('useThrottledCallback', () => {
  hookMatrix(() => typeof useThrottledCallback(() => {}, 100))

  describe('with fake timers', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('runs at once, then at most once per interval, and ends with the last arguments', async () => {
      const first = vi.fn<(x: number) => void>()
      const latest = vi.fn<(x: number) => void>()
      const view = await mount({ onMove: first })
      const stable = throttled

      throttled(1)
      expect(first).toHaveBeenCalledWith(1)
      throttled(2)
      throttled(3)
      expect(throttled.pending()).toBe(true)
      await view.rerender({ onMove: latest })
      expect(throttled).toBe(stable)

      vi.advanceTimersByTime(99)
      expect(latest).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(latest).toHaveBeenCalledExactlyOnceWith(3) // the latest callback, the last arguments
      expect(throttled.pending()).toBe(false)

      // A steady stream of calls runs once per interval.
      for (let i = 0; i < 50; i++) {
        throttled(i)
        vi.advanceTimersByTime(10)
      }
      vi.advanceTimersByTime(100)
      expect(latest.mock.calls.length).toBeGreaterThanOrEqual(5)
      expect(latest.mock.calls.length).toBeLessThanOrEqual(7)
      expect(latest).toHaveBeenLastCalledWith(49)

      // After a quiet interval, the next call runs at once again.
      latest.mockClear()
      vi.advanceTimersByTime(500)
      throttled(7)
      expect(latest).toHaveBeenCalledExactlyOnceWith(7)
      await view.unmount()
    })

    it('flush runs the pending call now; cancel and unmount drop it', async () => {
      const onMove = vi.fn<(x: number) => void>()
      const view = await mount({ onMove })
      throttled(1)
      throttled(2)
      throttled.flush()
      expect(onMove).toHaveBeenLastCalledWith(2)
      throttled.flush() // nothing pending
      expect(onMove).toHaveBeenCalledTimes(2)

      throttled(3)
      throttled.cancel()
      vi.advanceTimersByTime(1000)
      expect(onMove).toHaveBeenCalledTimes(2)

      vi.advanceTimersByTime(1000)
      throttled(4)
      throttled(5)
      await view.unmount()
      vi.advanceTimersByTime(1000)
      expect(onMove).toHaveBeenLastCalledWith(4)
    })

    it('a new interval drops the pending call', async () => {
      const onMove = vi.fn<(x: number) => void>()
      const view = await mount({ onMove })
      throttled(1)
      throttled(2)
      await view.rerender({ onMove, interval: 500 })
      vi.advanceTimersByTime(1000)
      expect(onMove).toHaveBeenCalledExactlyOnceWith(1)
      await view.unmount()
    })
  })
})
