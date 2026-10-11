import { useEffect, useMemo, useState } from 'react'

export type UserMediaState = {
  /** The live stream, or `null` while disabled, loading, or after an error. */
  stream: MediaStream | null
  /** `NotAllowedError` (denied), `NotFoundError` (no device), etc., or an `Error` if unsupported. */
  error: Error | null
  /** `true` while enabled and waiting for the stream or an error. */
  loading: boolean
}

type Result = Omit<UserMediaState, 'loading'>

const IDLE: UserMediaState = { stream: null, error: null, loading: false }
const EMPTY: Result = { stream: null, error: null }

const stopTracks = (stream: MediaStream) => stream.getTracks().forEach((track) => track.stop())

/**
 * Opens the camera and/or microphone with `getUserMedia`, and stops every
 * track on unmount, when disabled, or when the constraints change, so the
 * camera light turns off.
 *
 * Enabling it makes the browser ask for permission the first time. Returns
 * `{ stream: null, loading: false }` on the server, during hydration, and while
 * disabled. Constraints are compared by value, so an inline object is fine.
 *
 * Use when: a video call preview, scanning a QR code, recording audio, or
 * taking a profile photo.
 * Don't use when: a file input is enough (`<input type="file"
 * accept="image/*" capture>` opens the camera on phones with no permission
 * prompt). To check the permission first, use `usePermission('camera')`.
 *
 * @param constraints - `getUserMedia` constraints, e.g. `{ video: true, audio: false }`.
 * @param options - `enabled`: request while `true`. Default `true`.
 *
 * @example
 * const { stream, error } = useUserMedia({ video: { facingMode: 'environment' } })
 * const videoRef = useCallback(
 *   (video: HTMLVideoElement | null) => {
 *     if (video) video.srcObject = stream
 *   },
 *   [stream],
 * )
 * if (error) return <p>Camera unavailable: {error.message}</p>
 * return <video ref={videoRef} autoPlay playsInline muted />
 */
export function useUserMedia(
  constraints: MediaStreamConstraints,
  options: { enabled?: boolean } = {},
): UserMediaState {
  const { enabled = true } = options
  const key = JSON.stringify(constraints)
  const [result, setResult] = useState(EMPTY)

  useEffect(() => {
    if (!enabled) return
    if (!navigator.mediaDevices?.getUserMedia) {
      // oxlint-disable-next-line react/set-state-in-effect -- reports a one-time external check
      setResult({ stream: null, error: new Error('getUserMedia is not supported') })
      return
    }
    let stream: MediaStream | null = null
    let cancelled = false
    navigator.mediaDevices.getUserMedia(JSON.parse(key) as MediaStreamConstraints).then(
      (granted) => {
        // Unmounted or changed while the prompt was open: release it right away.
        if (cancelled) return stopTracks(granted)
        stream = granted
        setResult({ stream: granted, error: null })
      },
      (error: Error) => {
        if (!cancelled) setResult({ stream: null, error })
      },
    )
    return () => {
      cancelled = true
      if (stream) stopTracks(stream)
      setResult(EMPTY)
    }
  }, [enabled, key])

  return useMemo(
    () => (enabled ? { ...result, loading: !result.stream && !result.error } : IDLE),
    [enabled, result],
  )
}
