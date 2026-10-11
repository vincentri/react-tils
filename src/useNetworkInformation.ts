import { useSyncExternalStore } from 'react'

export type NetworkInfo = {
  /** The user turned on a data saver. `false` where unknown. */
  saveData: boolean
  /** Rough connection quality, or `'unknown'` where the browser doesn't say (Safari, Firefox). */
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown'
  /** Estimated bandwidth in Mbit/s, or `null` where unknown. */
  downlink: number | null
  /** Estimated round-trip time in milliseconds, or `null` where unknown. */
  rtt: number | null
}

// The Network Information API isn't in TypeScript's DOM types (it's Chromium-only).
type Connection = EventTarget & {
  saveData?: boolean
  effectiveType?: NetworkInfo['effectiveType']
  downlink?: number
  rtt?: number
}
const connection = () => (navigator as Navigator & { connection?: Connection }).connection

const UNKNOWN: NetworkInfo = {
  saveData: false,
  effectiveType: 'unknown',
  downlink: null,
  rtt: null,
}
let cached: NetworkInfo = UNKNOWN

function subscribe(onChange: () => void) {
  const info = connection()
  info?.addEventListener('change', onChange)
  return () => info?.removeEventListener('change', onChange)
}

// Same object until a value changes.
function getInfo(): NetworkInfo {
  const info = connection()
  if (!info) return UNKNOWN
  const next: NetworkInfo = {
    saveData: info.saveData ?? false,
    effectiveType: info.effectiveType ?? 'unknown',
    downlink: info.downlink ?? null,
    rtt: info.rtt ?? null,
  }
  const changed = (Object.keys(next) as Array<keyof NetworkInfo>).some((k) => next[k] !== cached[k])
  if (changed) cached = next
  return cached
}

/**
 * The connection's data-saver setting and rough quality, from the Network
 * Information API, updated when it changes.
 *
 * Only Chromium browsers report it; elsewhere every field is unknown
 * (`saveData: false`, `effectiveType: 'unknown'`), so treat unknown as a
 * normal connection. Renders `serverValue` on the server and during hydration.
 *
 * Use when: adapting heavy content, e.g. don't autoplay video or prefetch when
 * `saveData` is on or the connection is `'2g'`/`'slow-2g'`.
 * Don't use when: choosing image sizes; `<img srcset sizes>` lets the browser
 * decide. On the server, the `Save-Data` request header gives the same signal
 * before any JS runs. Don't block features on it: the estimates are rough.
 *
 * @param serverValue - Value on the server and during hydration. Default: all unknown.
 *
 * @example
 * const { saveData, effectiveType } = useNetworkInformation()
 * const lite = saveData || effectiveType === '2g' || effectiveType === 'slow-2g'
 * return lite ? <img src={poster} alt="" /> : <video src={clip} autoPlay muted loop />
 */
export function useNetworkInformation(serverValue: NetworkInfo = UNKNOWN): NetworkInfo {
  return useSyncExternalStore(subscribe, getInfo, () => serverValue)
}
