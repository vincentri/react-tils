import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useMediaQuery } from './useMediaQuery'

// happy-dom updates `matches` on resize but never fires `change`, so drive it by hand.
function fakeMatchMedia(initial: boolean) {
  let matches = initial
  const listeners = new Set<() => void>()
  vi.spyOn(window, 'matchMedia').mockImplementation(
    () =>
      ({
        get matches() {
          return matches
        },
        addEventListener: (_: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
      }) as unknown as MediaQueryList,
  )
  return {
    listeners,
    set(value: boolean) {
      matches = value
      listeners.forEach((fn) => fn())
    },
  }
}

const Wide = () => String(useMediaQuery('(min-width: 768px)'))
const WideOnServer = () => String(useMediaQuery('(min-width: 768px)', true))

describe('useMediaQuery', () => {
  hookMatrix(() => useMediaQuery('(min-width: 768px)'))

  it('uses serverValue on the server', () => {
    expect(renderToString(createElement(WideOnServer))).toBe('true')
  })

  it('follows media query changes and unsubscribes on unmount', async () => {
    const mq = fakeMatchMedia(true)
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Wide)))
    expect(container.textContent).toBe('true')

    await act(async () => mq.set(false))
    expect(container.textContent).toBe('false')

    await act(async () => root.unmount())
    expect(mq.listeners.size).toBe(0)
  })
})
