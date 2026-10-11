import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Politeness, useAnnounce } from './useAnnounce'
import { hookMatrix } from './testing'

let announce: (message: string, politeness?: Politeness) => void
const Announcer = () => {
  announce = useAnnounce()
  return null
}
const region = (politeness: Politeness) =>
  document.body.querySelector<HTMLElement>(`[aria-live="${politeness}"]`)

async function mount(count = 1) {
  const root = createRoot(document.createElement('div'))
  await act(async () =>
    root.render(Array.from({ length: count }, (_, i) => createElement(Announcer, { key: i }))),
  )
  return () => act(async () => root.unmount())
}

describe('useAnnounce', () => {
  hookMatrix(() => useAnnounce())

  describe('with fake timers', () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ['requestAnimationFrame'] }))
    afterEach(() => vi.useRealTimers())

    it('creates hidden live regions on mount, before any message, and removes them with the last user', async () => {
      const unmount = await mount(2)
      expect(document.body.querySelectorAll('[aria-live]')).toHaveLength(2)
      expect(region('polite')!.getAttribute('role')).toBe('status')
      expect(region('assertive')!.getAttribute('role')).toBe('alert')
      expect(region('polite')!.style.position).toBe('absolute')
      await unmount()
      expect(document.body.querySelectorAll('[aria-live]')).toHaveLength(0)
    })

    it('announces in the chosen region, and announces the same message again', async () => {
      const unmount = await mount()
      act(() => announce('Link copied'))
      expect(region('polite')!.textContent).toBe('') // cleared first
      act(() => vi.advanceTimersToNextFrame())
      expect(region('polite')!.textContent).toBe('Link copied')

      act(() => announce('Link copied'))
      expect(region('polite')!.textContent).toBe('') // a repeat is a change, so it's read again
      act(() => vi.advanceTimersToNextFrame())
      expect(region('polite')!.textContent).toBe('Link copied')

      act(() => announce('Payment failed', 'assertive'))
      act(() => vi.advanceTimersToNextFrame())
      expect(region('assertive')!.textContent).toBe('Payment failed')
      await unmount()
    })
  })
})
