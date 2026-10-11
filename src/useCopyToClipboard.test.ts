import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useCopyToClipboard } from './useCopyToClipboard'

let copy: (text: string) => Promise<boolean>
let copied = false
const Copy = () => {
  ;[copy, copied] = useCopyToClipboard(1000)
  return null
}

function fakeClipboard(fail = false) {
  const writeText = vi.fn<(text: string) => Promise<void>>(async () => {
    if (fail) throw new DOMException('denied', 'NotAllowedError')
  })
  vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText } as unknown as Clipboard)
  return writeText
}

describe('useCopyToClipboard', () => {
  hookMatrix(() => useCopyToClipboard()[1])

  describe('with fake timers', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('copies, reports copied, resets after the timeout, and clears the timer on unmount', async () => {
      const writeText = fakeClipboard()
      const root = createRoot(document.createElement('div'))
      await act(async () => root.render(createElement(Copy)))

      let ok = false
      await act(async () => {
        ok = await copy('secret')
      })
      expect(ok).toBe(true)
      expect(writeText).toHaveBeenCalledWith('secret')
      expect(copied).toBe(true)

      await act(async () => vi.advanceTimersByTime(1000))
      expect(copied).toBe(false)

      await act(async () => {
        await copy('again')
      })
      await act(async () => root.unmount())
      expect(vi.getTimerCount()).toBe(0)
    })

    it('returns false when the browser refuses', async () => {
      fakeClipboard(true)
      const root = createRoot(document.createElement('div'))
      await act(async () => root.render(createElement(Copy)))
      let ok = true
      await act(async () => {
        ok = await copy('secret')
      })
      expect(ok).toBe(false)
      expect(copied).toBe(false)
      await act(async () => root.unmount())
    })
  })
})
