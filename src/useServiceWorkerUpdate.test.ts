import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useServiceWorkerUpdate } from './useServiceWorkerUpdate'

class FakeWorker extends EventTarget {
  state: ServiceWorkerState = 'installing'
  postMessage = vi.fn<(message: unknown) => void>()
}

function fakeServiceWorker({ controlled = true, waiting = false } = {}) {
  const registration = Object.assign(new EventTarget(), {
    waiting: waiting ? new FakeWorker() : null,
    installing: null as FakeWorker | null,
    update: vi.fn<() => Promise<void>>(async () => {}),
  })
  const container = Object.assign(new EventTarget(), {
    controller: controlled ? {} : null,
    getRegistration: vi.fn<() => Promise<typeof registration>>(async () => registration),
  })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: container })
  return { registration, container }
}

let state: ReturnType<typeof useServiceWorkerUpdate>
const Banner = ({ checkIntervalMs }: { checkIntervalMs?: number | undefined }) => {
  state = useServiceWorkerUpdate(checkIntervalMs === undefined ? {} : { checkIntervalMs })
  return null
}

async function mount(checkIntervalMs?: number) {
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Banner, { checkIntervalMs })))
  return () => act(async () => root.unmount())
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'serviceWorker')
  vi.useRealTimers()
})

describe('useServiceWorkerUpdate', () => {
  hookMatrix(() => useServiceWorkerUpdate())

  it('finds a worker that was already waiting when the page loaded', async () => {
    fakeServiceWorker({ waiting: true })
    const unmount = await mount()
    expect(state.updateAvailable).toBe(true)
    await unmount()
  })

  it('notices a new worker that finishes installing while the page is open', async () => {
    const { registration } = fakeServiceWorker()
    const unmount = await mount()
    expect(state.updateAvailable).toBe(false)

    const installing = new FakeWorker()
    registration.installing = installing
    await act(async () => registration.dispatchEvent(new Event('updatefound')))
    installing.state = 'installed'
    await act(async () => installing.dispatchEvent(new Event('statechange')))
    expect(state.updateAvailable).toBe(true)
    await unmount()
  })

  it('ignores the very first install, when no worker controls the page yet', async () => {
    fakeServiceWorker({ controlled: false, waiting: true })
    const unmount = await mount()
    expect(state.updateAvailable).toBe(false)
    await unmount()
  })

  it('update() tells the waiting worker to take over, then reloads once', async () => {
    const { registration, container } = fakeServiceWorker({ waiting: true })
    const reload = vi.fn<() => void>()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...location, reload } as Location)
    const unmount = await mount()
    await act(async () => state.update())
    expect((registration.waiting as FakeWorker).postMessage).toHaveBeenCalledWith({
      type: 'SKIP_WAITING',
    })
    expect(reload).not.toHaveBeenCalled() // not until the new worker controls the page
    container.dispatchEvent(new Event('controllerchange'))
    container.dispatchEvent(new Event('controllerchange'))
    expect(reload).toHaveBeenCalledTimes(1)
    await unmount()
  })

  it('checks for updates every checkIntervalMs', async () => {
    vi.useFakeTimers()
    const { registration } = fakeServiceWorker()
    const unmount = await mount(1000)
    await act(async () => vi.advanceTimersByTime(3000))
    expect(registration.update).toHaveBeenCalledTimes(3)
    await unmount()
    vi.advanceTimersByTime(3000)
    expect(registration.update).toHaveBeenCalledTimes(3)
  })
})
