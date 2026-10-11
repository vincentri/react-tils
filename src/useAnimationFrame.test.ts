import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useAnimationFrame } from './useAnimationFrame'

type Callback = (deltaMs: number, timeMs: number) => void
type Props = { callback: Callback; active: boolean }
const Loop = ({ callback, active }: Props) => {
  useAnimationFrame(callback, active)
  return null
}

describe('useAnimationFrame', () => {
  hookMatrix(() => useAnimationFrame(() => {}))

  describe('with fake timers', () => {
    beforeEach(() =>
      vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] }),
    )
    afterEach(() => vi.useRealTimers())

    it('passes the time since the last frame, calls the latest callback, and stops when inactive', async () => {
      const first = vi.fn<Callback>()
      const second = vi.fn<Callback>()
      const root = createRoot(document.createElement('div'))
      const render = (props: Props) => act(async () => root.render(createElement(Loop, props)))

      await render({ callback: first, active: true })
      await act(async () => vi.advanceTimersByTime(16 * 3))
      expect(first).toHaveBeenCalledTimes(3)
      expect(first.mock.calls[0]![0]).toBe(0)
      expect(first.mock.calls[1]![0]).toBe(16)

      await render({ callback: second, active: true })
      await act(async () => vi.advanceTimersByTime(16))
      expect(second).toHaveBeenCalledTimes(1)
      expect(second.mock.calls[0]![0]).toBe(16) // same loop, not restarted

      await render({ callback: second, active: false })
      await act(async () => vi.advanceTimersByTime(160))
      expect(second).toHaveBeenCalledTimes(1)

      await render({ callback: second, active: true })
      await act(async () => root.unmount())
      await act(async () => vi.advanceTimersByTime(160))
      expect(second).toHaveBeenCalledTimes(1)
    })
  })
})
