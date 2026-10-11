import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

export type MediaRecorderOptions = {
  /** Formats to try, in order; the first one the browser can record is used. Default: Opus in WebM, then MP4 (Safari), then Ogg, for audio; VP9/VP8 WebM, then MP4, for video. */
  mimeTypes?: string[]
}

export type MediaRecorderState = {
  /** `false` on the server, during hydration, and in browsers without `MediaRecorder`. */
  supported: boolean
  recording: boolean
  /** The format actually recorded, e.g. `audio/webm;codecs=opus` or `audio/mp4`. Use it for the file extension and upload. */
  mimeType: string | null
  /** The last finished recording. */
  blob: Blob | null
  error: Error | null
  /** Start recording `stream`. Does nothing while recording or without a stream. */
  start: () => void
  /** Stop and resolve with the finished recording, including its last chunk. */
  stop: () => Promise<Blob | null>
}

const AUDIO = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm']
const VIDEO = ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4']

const subscribeNothing = () => () => {}

/**
 * Records a `MediaStream` (microphone, camera, or screen) into a file. Pair
 * it with `useUserMedia` for the stream.
 *
 * Picks a format the browser can actually record: Chrome and Firefox record
 * WebM, Safari records MP4, so a hardcoded `audio/webm` fails in Safari.
 * `stop()` resolves with the finished `Blob` once the recorder has delivered
 * its last chunk. Recording stops on unmount and when `stream` changes; the
 * stream itself is left running, so stop its tracks yourself (`useUserMedia`
 * does that on unmount).
 *
 * Use when: voice notes, voice input for an AI chat (record, then send to a
 * transcription API), recording a video message, or a screen recording.
 * Don't use when: you want live speech-to-text in the browser; that is the
 * Web Speech API. To only show a camera or microphone preview, use
 * `useUserMedia` alone.
 *
 * Other libraries call this `useRecorder`, `useAudioRecorder`, `react-media-recorder`.
 *
 * @param stream - The stream to record, or `null` until it's ready.
 * @param options - `mimeTypes`: formats to try, in order. Optional.
 * @returns `{ supported, recording, mimeType, blob, error, start, stop }`.
 *
 * @example
 * const [on, setOn] = useState(false)
 * const { stream } = useUserMedia({ audio: true }, { enabled: on })
 * const recorder = useMediaRecorder(stream)
 * const finish = async () => {
 *   const blob = await recorder.stop()
 *   if (blob) await transcribe(new File([blob], 'note', { type: blob.type }))
 *   setOn(false)
 * }
 * return recorder.recording
 *   ? <button onClick={finish}>Stop</button>
 *   : <button onClick={() => (stream ? recorder.start() : setOn(true))}>{stream ? 'Record' : 'Allow microphone'}</button>
 */
export function useMediaRecorder(
  stream: MediaStream | null,
  options: MediaRecorderOptions = {},
): MediaRecorderState {
  const supported = useSyncExternalStore(
    subscribeNothing,
    () => typeof MediaRecorder !== 'undefined',
    () => false,
  )
  const [recording, setRecording] = useState(false)
  const [mimeType, setMimeType] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const recorder = useRef<{ instance: MediaRecorder; abort: () => void } | null>(null)
  const waiting = useRef<((blob: Blob | null) => void)[]>([])
  const typesKey = options.mimeTypes?.join('\n')

  // A new stream or unmount ends the current recording, without keeping it.
  useEffect(() => {
    if (!stream) return
    // The ref objects are stable; at cleanup we want whatever recording is active then.
    const active = recorder
    const pending = waiting.current
    return () => {
      active.current?.abort()
      active.current = null
      for (const resolve of pending.splice(0)) resolve(null)
    }
  }, [stream])

  const start = useCallback(() => {
    if (!stream || typeof MediaRecorder === 'undefined' || recorder.current) return
    const preferred = typesKey?.split('\n') ?? (stream.getVideoTracks().length > 0 ? VIDEO : AUDIO)
    const type = preferred.find((t) => MediaRecorder.isTypeSupported(t))
    let next: MediaRecorder
    try {
      next = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)))
      return
    }
    const chunks: Blob[] = []
    let aborted = false
    const onData = (event: BlobEvent) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    // Built only on stop: the last chunk arrives just before it.
    const onStop = () => {
      if (aborted) return
      const finished = new Blob(chunks, { type: next.mimeType || type || '' })
      recorder.current = null
      setBlob(finished)
      setRecording(false)
      for (const resolve of waiting.current.splice(0)) resolve(finished)
    }
    next.addEventListener('dataavailable', onData)
    next.addEventListener('stop', onStop)
    next.addEventListener('error', () => aborted || setError(new Error('Recording failed')))
    recorder.current = {
      instance: next,
      abort: () => {
        // Its stop event is ignored, so reset here; the cut-off recording isn't kept.
        aborted = true
        if (next.state !== 'inactive') next.stop()
        setRecording(false)
      },
    }
    setError(null)
    next.start()
    setMimeType(next.mimeType || type || null)
    setRecording(true)
  }, [stream, typesKey])

  const stop = useCallback((): Promise<Blob | null> => {
    const current = recorder.current?.instance
    if (!current || current.state === 'inactive') return Promise.resolve(null)
    return new Promise((resolve) => {
      waiting.current.push(resolve)
      current.stop()
    })
  }, [])

  return useMemo(
    () => ({ supported, recording, mimeType, blob, error, start, stop }),
    [supported, recording, mimeType, blob, error, start, stop],
  )
}
