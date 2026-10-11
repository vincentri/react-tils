import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { type DebouncedFunction, useDebouncedCallback } from './useDebouncedCallback'

let debounced: DebouncedFunction<[string]>
const Search = (props: { onSearch: (q: string) => void; delay?: number; maxWaitMs?: number }) => {
  debounced = useDebouncedCallback(
    props.onSearch,
    props.delay ?? 300,
    props.maxWaitMs === undefined ? {} : { maxWaitMs: props.maxWaitMs },
  )
  return null
}

async function mount(props: Parameters<typeof Search>[0]) {
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Search, props)))
  return {
    rerender: (next: Parameters<typeof Search>[0]) =>
      act(async () => root.render(createElement(Search, next))),
    unmount: () => act(async () => root.unmount()),
  }
}

describe('useDebouncedCallback', () => {
  hookMatrix(() => typeof useDebouncedCallback(() => {}, 100))

  describe('with fake timers', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('runs once after the last call with its arguments, using the latest callback', async () => {
      const first = vi.fn<(q: string) => void>()
      const second = vi.fn<(q: string) => void>()
      const view = await mount({ onSearch: first })
      const stable = debounced
      debounced('r')
      vi.advanceTimersByTime(200)
      debounced('re')
      await view.rerender({ onSearch: second })
      expect(debounced).toBe(stable)
      vi.advanceTimersByTime(299)
      expect(second).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledExactlyOnceWith('re')
      await view.unmount()
    })

    it('runs at least every maxWaitMs during a burst', async () => {
      const onSearch = vi.fn<(q: string) => void>()
      const view = await mount({ onSearch, delay: 100, maxWaitMs: 250 })
      for (let i = 0; i < 10; i++) {
        debounced(String(i))
        vi.advanceTimersByTime(50)
      }
      expect(onSearch).toHaveBeenCalledTimes(2)
      await view.unmount()
    })

    it('supports cancel, flush, and pending, and drops a pending call on unmount', async () => {
      const onSearch = vi.fn<(q: string) => void>()
      const view = await mount({ onSearch })
      debounced('a')
      expect(debounced.pending()).toBe(true)
      debounced.cancel()
      vi.advanceTimersByTime(1000)
      expect(onSearch).not.toHaveBeenCalled()

      debounced('b')
      debounced.flush()
      expect(onSearch).toHaveBeenCalledExactlyOnceWith('b')
      expect(debounced.pending()).toBe(false)

      debounced('c')
      await view.unmount()
      vi.advanceTimersByTime(1000)
      expect(onSearch).toHaveBeenCalledTimes(1)
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
