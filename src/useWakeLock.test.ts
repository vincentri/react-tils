import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useWakeLock } from './useWakeLock'

function fakeWakeLock() {
  const sentinels: Array<EventTarget & { release: () => Promise<void>; released: boolean }> = []
  const request = vi.fn<() => Promise<WakeLockSentinel>>(async () => {
    const sentinel = Object.assign(new EventTarget(), {
      released: false,
      async release() {
        if (sentinel.released) return
        sentinel.released = true
        sentinel.dispatchEvent(new Event('release'))
      },
    })
    sentinels.push(sentinel)
    return sentinel as unknown as WakeLockSentinel
  })
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })
  return { request, sentinels }
}

let state = { supported: false, active: false }
const Awake = ({ enabled }: { enabled: boolean }) => {
  state = useWakeLock(enabled)
  return null
}

async function mount(enabled: boolean) {
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Awake, { enabled })))
  return {
    set: (next: boolean) => act(async () => root.render(createElement(Awake, { enabled: next }))),
    unmount: () => act(async () => root.unmount()),
  }
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock')
})

describe('useWakeLock', () => {
  hookMatrix(() => useWakeLock())

  it('acquires while enabled, releases when disabled and on unmount', async () => {
    const wake = fakeWakeLock()
    const view = await mount(false)
    expect(state).toEqual({ supported: true, active: false })
    expect(wake.request).not.toHaveBeenCalled()

    await view.set(true)
    expect(state.active).toBe(true)

    await view.set(false)
    expect(wake.sentinels[0]!.released).toBe(true)
    expect(state.active).toBe(false)

    await view.set(true)
    await view.unmount()
    expect(wake.sentinels[1]!.released).toBe(true)
  })

  it('re-acquires when the tab becomes visible after the browser released it', async () => {
    const wake = fakeWakeLock()
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const view = await mount(true)
    expect(wake.request).toHaveBeenCalledTimes(1)

    // The browser releases the lock when the tab is hidden.
    visibility.mockReturnValue('hidden')
    await act(async () => {
      await wake.sentinels[0]!.release()
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(state.active).toBe(false)

    visibility.mockReturnValue('visible')
    await act(async () => document.dispatchEvent(new Event('visibilitychange')))
    expect(wake.request).toHaveBeenCalledTimes(2)
    expect(state.active).toBe(true)
    await view.unmount()
  })

  it('stays inactive when unsupported', async () => {
    const view = await mount(true)
    expect(state).toEqual({ supported: false, active: false })
    await view.unmount()
  })
})
