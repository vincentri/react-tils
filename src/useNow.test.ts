import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useNow } from './useNow'

const Clock = () => String(useNow(1000))
const WithServerTime = () => String(useNow(1000, 42))

describe('useNow', () => {
  hookMatrix(() => useNow(1000))

  it('is serverValue on the server', () => {
    expect(renderToString(createElement(Clock))).toBe('null')
    expect(renderToString(createElement(WithServerTime))).toBe('42')
  })

  describe('with fake timers', () => {
    beforeEach(() => vi.useFakeTimers({ now: 10_500 }))
    afterEach(() => vi.useRealTimers())

    it('rounds down, ticks on whole intervals, and stops on unmount', async () => {
      const container = document.createElement('div')
      const root = createRoot(container)
      await act(async () => root.render(createElement(Clock)))
      expect(container.textContent).toBe('10000')

      await act(async () => vi.advanceTimersByTime(499))
      expect(container.textContent).toBe('10000')
      await act(async () => vi.advanceTimersByTime(1))
      expect(container.textContent).toBe('11000')
      await act(async () => vi.advanceTimersByTime(3000))
      expect(container.textContent).toBe('14000')

      await act(async () => root.unmount())
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
