import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useDebouncedValue } from './useDebouncedValue'

const Debounced = ({ value }: { value: string }) => useDebouncedValue(value, 100)

describe('useDebouncedValue', () => {
  hookMatrix(() => useDebouncedValue('a', 100))

  it('is the value on the server', () => {
    expect(renderToString(createElement(Debounced, { value: 'react' }))).toBe('react')
  })

  describe('with fake timers', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('starts as the value, then updates only after the value settles', async () => {
      const container = document.createElement('div')
      const root = createRoot(container)
      const render = (value: string) =>
        act(async () => root.render(createElement(Debounced, { value })))
      await render('r')
      expect(container.textContent).toBe('r')

      await render('re')
      await act(async () => vi.advanceTimersByTime(60))
      await render('rea')
      await act(async () => vi.advanceTimersByTime(60))
      expect(container.textContent).toBe('r') // still changing

      await act(async () => vi.advanceTimersByTime(40))
      expect(container.textContent).toBe('rea')

      await render('react')
      await act(async () => root.unmount())
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
