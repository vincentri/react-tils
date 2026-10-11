import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { type DeviceOrientationState, useDeviceOrientation } from './useDeviceOrientation'

let state: DeviceOrientationState
const Compass = () => {
  state = useDeviceOrientation()
  return null
}

const turn = (alpha: number | null, beta: number | null, gamma: number | null) =>
  window.dispatchEvent(Object.assign(new Event('deviceorientation'), { alpha, beta, gamma }))

async function mount() {
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Compass)))
  return () => act(async () => root.unmount())
}

afterEach(() => vi.unstubAllGlobals())

describe('useDeviceOrientation', () => {
  hookMatrix(() => useDeviceOrientation())

  it('follows readings right away where no permission is needed, and ignores empty ones', async () => {
    vi.stubGlobal('DeviceOrientationEvent', class extends Event {})
    const unmount = await mount()
    expect(state.needsPermission).toBe(false)
    expect(state.orientation).toBeNull()

    await act(async () => turn(null, null, null)) // a desktop with no sensor
    expect(state.orientation).toBeNull()
    await act(async () => turn(90, 10, -5))
    expect(state.orientation).toEqual({ alpha: 90, beta: 10, gamma: -5 })
    await unmount()
  })

  it('on iOS, waits for permission from a tap before listening', async () => {
    const requestPermission = vi.fn<() => Promise<'granted' | 'denied'>>(async () => 'granted')
    vi.stubGlobal(
      'DeviceOrientationEvent',
      Object.assign(class extends Event {}, { requestPermission }),
    )
    const unmount = await mount()
    expect(state.needsPermission).toBe(true) // iOS sends no readings until granted

    let granted = false
    await act(async () => {
      granted = await state.requestPermission()
    })
    expect(granted).toBe(true)
    expect(state.needsPermission).toBe(false)
    await act(async () => turn(45, 0, 0))
    expect(state.orientation).toEqual({ alpha: 45, beta: 0, gamma: 0 })
    await unmount()
  })

  it('stays waiting when permission is denied or requested outside a tap', async () => {
    const requestPermission = vi
      .fn<() => Promise<'granted' | 'denied'>>()
      .mockResolvedValueOnce('denied')
      .mockRejectedValueOnce(new Error('NotAllowedError'))
    vi.stubGlobal(
      'DeviceOrientationEvent',
      Object.assign(class extends Event {}, { requestPermission }),
    )
    const unmount = await mount()
    await act(async () => void (await state.requestPermission()))
    expect(state.needsPermission).toBe(true)
    let result = true
    await act(async () => {
      result = await state.requestPermission()
    })
    expect(result).toBe(false)
    expect(state.needsPermission).toBe(true)
    await unmount()
  })

  it('drops the permission button when readings arrive without asking, as in Chrome', async () => {
    const requestPermission = vi.fn<() => Promise<'granted' | 'denied'>>(async () => 'granted')
    vi.stubGlobal(
      'DeviceOrientationEvent',
      Object.assign(class extends Event {}, { requestPermission }),
    )
    const unmount = await mount()
    expect(state.needsPermission).toBe(true)
    await act(async () => turn(10, 20, 30))
    expect(state.needsPermission).toBe(false)
    expect(state.orientation).toEqual({ alpha: 10, beta: 20, gamma: 30 })
    expect(requestPermission).not.toHaveBeenCalled()
    await unmount()
  })
})
