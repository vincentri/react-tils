import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type GeolocationOptions, type GeolocationState, useGeolocation } from './useGeolocation'
import { hookMatrix } from './testing'

function fakeGeolocation() {
  let onSuccess: PositionCallback | undefined
  let onError: PositionErrorCallback | null | undefined
  const watchPosition = vi.fn<
    (
      success: PositionCallback,
      error?: PositionErrorCallback | null,
      options?: PositionOptions,
    ) => number
  >((success, error) => {
    onSuccess = success
    onError = error
    return 7
  })
  const clearWatch = vi.fn<(id: number) => void>()
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { watchPosition, clearWatch },
  })
  return {
    watchPosition,
    clearWatch,
    move: (latitude: number) =>
      act(async () => onSuccess?.({ coords: { latitude } } as unknown as GeolocationPosition)),
    fail: (message: string) =>
      act(async () => onError?.({ code: 1, message } as unknown as GeolocationPositionError)),
  }
}

let state: GeolocationState
const Geo = (options: GeolocationOptions) => {
  state = useGeolocation(options)
  return null
}

async function mount(options: GeolocationOptions) {
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Geo, options)))
  return {
    rerender: (next: GeolocationOptions) => act(async () => root.render(createElement(Geo, next))),
    unmount: () => act(async () => root.unmount()),
  }
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'geolocation')
})

describe('useGeolocation', () => {
  hookMatrix(() => useGeolocation({ enabled: false }))
  hookMatrix(() => useGeolocation())

  it('does nothing until enabled, so there is no prompt on load', async () => {
    const geo = fakeGeolocation()
    const view = await mount({ enabled: false })
    expect(state).toEqual({ loading: false, position: null, error: null })
    expect(geo.watchPosition).not.toHaveBeenCalled()
    await view.unmount()
  })

  it('loads, follows positions, keeps the last position on error, and clears the watch', async () => {
    const geo = fakeGeolocation()
    const view = await mount({ enableHighAccuracy: true, timeout: 5000 })
    expect(state.loading).toBe(true)
    expect(geo.watchPosition.mock.calls[0]![2]).toEqual({
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000,
    })

    await geo.move(52.5)
    expect(state.loading).toBe(false)
    expect(state.position?.coords.latitude).toBe(52.5)

    await geo.fail('timeout')
    expect(state.error?.message).toBe('timeout')
    expect(state.position?.coords.latitude).toBe(52.5)

    await view.rerender({ enabled: false })
    expect(geo.clearWatch).toHaveBeenCalledWith(7)
    expect(state.loading).toBe(false)
    await view.unmount()
  })

  it('reports an error when the browser has no geolocation', async () => {
    // Remove it from whichever object in the prototype chain defines it, then restore.
    let owner: object | null = navigator
    while (owner && !Object.hasOwn(owner, 'geolocation')) owner = Object.getPrototypeOf(owner)
    const descriptor = owner && Object.getOwnPropertyDescriptor(owner, 'geolocation')
    if (owner) Reflect.deleteProperty(owner, 'geolocation')
    try {
      expect(navigator.geolocation).toBeFalsy()
      const view = await mount({})
      expect(state).toMatchObject({ loading: false, position: null })
      expect(state.error?.message).toBe('Geolocation is not supported')
      await view.unmount()
    } finally {
      if (owner && descriptor) Object.defineProperty(owner, 'geolocation', descriptor)
    }
  })
})
