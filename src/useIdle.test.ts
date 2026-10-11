import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useIdle } from './useIdle'

const Idle = () => String(useIdle(1000))
const advance = (ms: number) => act(async () => vi.advanceTimersByTime(ms))
const move = () => act(async () => window.dispatchEvent(new Event('pointermove')))

describe('useIdle', () => {
  hookMatrix(() => useIdle())

  describe('with fake timers', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('goes idle after the timeout, and activity resets it', async () => {
      const container = document.createElement('div')
      const root = createRoot(container)
      await act(async () => root.render(createElement(Idle)))
      expect(container.textContent).toBe('false')

      await advance(600)
      await move() // resets the clock
      await advance(600)
      expect(container.textContent).toBe('false')
      await advance(400)
      expect(container.textContent).toBe('true')

      await move()
      expect(container.textContent).toBe('false')
      await advance(1000)
      expect(container.textContent).toBe('true')

      await act(async () => root.unmount())
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
