import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'

export type Orientation = {
  /** Compass direction around the vertical axis, 0 to 360 degrees. */
  alpha: number | null
  /** Front-to-back tilt, -180 to 180 degrees. */
  beta: number | null
  /** Left-to-right tilt, -90 to 90 degrees. */
  gamma: number | null
}

export type DeviceOrientationState = {
  /** The latest reading, or `null` before the first one (and always on devices without the sensor). */
  orientation: Orientation | null
  /** `true` while the browser may need permission and no reading has arrived (iOS until granted): show a button that calls `requestPermission`. */
  needsPermission: boolean
  /** Ask for motion access on iOS. Must be called from a tap or click. Resolves to whether it was granted. */
  requestPermission: () => Promise<boolean>
}

type PermissionApi = { requestPermission?: () => Promise<'granted' | 'denied'> }
const permissionApi = (): PermissionApi | undefined =>
  typeof DeviceOrientationEvent === 'undefined'
    ? undefined
    : (DeviceOrientationEvent as unknown as PermissionApi)
const subscribeNothing = () => () => {}

/**
 * The device's orientation from its motion sensors: compass direction
 * (`alpha`) and tilt (`beta`, `gamma`), updated as it moves.
 *
 * On iOS the user must allow motion access, and the request only works from
 * a tap: until then `needsPermission` is `true`, so show a button that calls
 * `requestPermission()`. Browsers that don't require it (Chrome, Firefox)
 * send readings right away, and `needsPermission` turns `false` on the first
 * one.
 * Laptops and desktops usually have no sensor, so `orientation` stays `null`.
 * Re-renders on every reading, up to about 60 times a second.
 *
 * Use when: tilt effects, a compass, steering in a game, or a "level" tool.
 * Don't use when: you only need portrait or landscape; use
 * `useMediaQuery('(orientation: portrait)')`. For the user's position, use
 * `useGeolocation`.
 *
 * Other libraries call this `useOrientation` (react-use), `useDeviceMotion`, `useGyroscope`.
 *
 * @returns `{ orientation, needsPermission, requestPermission }`.
 *
 * @example
 * const { orientation, needsPermission, requestPermission } = useDeviceOrientation()
 * if (needsPermission) return <button onClick={requestPermission}>Enable tilt</button>
 * const tilt = orientation?.gamma ?? 0
 * return <div style={{ transform: `rotate(${tilt}deg)` }}>🧭</div>
 */
export function useDeviceOrientation(): DeviceOrientationState {
  const asksPermission = useSyncExternalStore(
    subscribeNothing,
    () => typeof permissionApi()?.requestPermission === 'function',
    () => false,
  )
  const [granted, setGranted] = useState(false)
  const [orientation, setOrientation] = useState<Orientation | null>(null)
  // Always listen: browsers that offer requestPermission but don't require it (Chrome) send
  // readings right away, so only ask while nothing has arrived. iOS sends nothing until granted.
  const needsPermission = asksPermission && !granted && orientation === null

  useEffect(() => {
    const listener = (event: DeviceOrientationEvent) => {
      const { alpha, beta, gamma } = event
      // Desktops can fire one event with no readings at all.
      if (alpha === null && beta === null && gamma === null) return
      setOrientation({ alpha, beta, gamma })
    }
    window.addEventListener('deviceorientation', listener)
    return () => window.removeEventListener('deviceorientation', listener)
  }, [])

  const requestPermission = useCallback(async () => {
    const request = permissionApi()?.requestPermission
    if (!request) return true
    try {
      const ok = (await request()) === 'granted'
      setGranted(ok)
      return ok
    } catch {
      return false // called outside a tap, or the user dismissed it
    }
  }, [])

  return useMemo(
    () => ({ orientation, needsPermission, requestPermission }),
    [orientation, needsPermission, requestPermission],
  )
}
