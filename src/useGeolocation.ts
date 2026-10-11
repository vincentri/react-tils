import { useEffect, useMemo, useState } from 'react'

export type GeolocationOptions = {
  /** Start watching. Default `true`. Pass `false` until the user asks, to avoid a prompt on page load. */
  enabled?: boolean
  /** Ask for GPS-level accuracy. Slower and uses more battery. Default `false`. */
  enableHighAccuracy?: boolean
  /** Accept a cached position up to this many milliseconds old. Default `0`. */
  maximumAge?: number
  /** Give up after this many milliseconds per attempt. Default: no limit. */
  timeout?: number
}

export type GeolocationState = {
  /** `true` while enabled and waiting for the first position or error. */
  loading: boolean
  position: GeolocationPosition | null
  /** `GeolocationPositionError` (denied, unavailable, timeout), or an `Error` if the browser has no geolocation. */
  error: GeolocationPositionError | Error | null
}

type Result = Omit<GeolocationState, 'loading'>

const IDLE: GeolocationState = { loading: false, position: null, error: null }
const EMPTY: Result = { position: null, error: null }

/**
 * The device's position, watched with `navigator.geolocation.watchPosition`
 * and updated as it moves. Stops watching on unmount or when disabled.
 *
 * Enabling it makes the browser ask the user for permission the first time,
 * so pass `enabled: false` until the user asks for location (e.g. clicks "Use
 * my location"). On the server and during hydration it returns the initial
 * state: `loading` if enabled, with no position.
 *
 * Use when: showing the user on a map, sorting nearby results, or filling in a
 * location after the user asks.
 * Don't use when: a rough region is enough; use IP-based location on the
 * server, which needs no prompt. Don't enable it on page load: users deny
 * unexpected prompts, and a denial is hard to undo. To check the permission
 * without prompting, use `usePermission('geolocation')`.
 *
 * @param options - `enabled`, `enableHighAccuracy`, `maximumAge`, and `timeout`.
 * All optional.
 *
 * @example
 * const [asked, setAsked] = useState(false)
 * const { loading, position, error } = useGeolocation({ enabled: asked })
 * if (!asked) return <button onClick={() => setAsked(true)}>Use my location</button>
 * if (loading) return <p>Locating…</p>
 * if (error) return <p>Could not get your location: {error.message}</p>
 * return <Map lat={position!.coords.latitude} lng={position!.coords.longitude} />
 */
export function useGeolocation(options: GeolocationOptions = {}): GeolocationState {
  const { enabled = true, enableHighAccuracy = false, maximumAge = 0, timeout } = options
  const [result, setResult] = useState(EMPTY)

  useEffect(() => {
    if (!enabled) return
    if (!navigator.geolocation) {
      // oxlint-disable-next-line react/set-state-in-effect -- reports a one-time external check
      setResult({ position: null, error: new Error('Geolocation is not supported') })
      return
    }
    const id = navigator.geolocation.watchPosition(
      (position) => setResult({ position, error: null }),
      // Keep the last known position when a later update fails.
      (error) => setResult((prev) => ({ position: prev.position, error })),
      timeout === undefined
        ? { enableHighAccuracy, maximumAge }
        : { enableHighAccuracy, maximumAge, timeout },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [enabled, enableHighAccuracy, maximumAge, timeout])

  return useMemo(
    () => (enabled ? { loading: !result.position && !result.error, ...result } : IDLE),
    [enabled, result],
  )
}
