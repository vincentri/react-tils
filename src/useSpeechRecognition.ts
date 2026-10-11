import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

export type SpeechRecognitionOptions = {
  /** BCP 47 language, e.g. `'en-US'`. Default: the page's language. */
  lang?: string
  /** Keep listening across pauses instead of stopping after the first phrase. Default `false`. */
  continuous?: boolean
}

export type SpeechRecognitionState = {
  /** `false` on the server, during hydration, and in browsers without speech recognition (Firefox). */
  supported: boolean
  listening: boolean
  /** Everything recognized so far, final words only. */
  transcript: string
  /** Words still being recognized; they may change before becoming final. */
  interim: string
  /** e.g. `'not-allowed'` (microphone blocked), `'no-speech'`, `'network'`. */
  error: string | null
  /** Start listening. Call it from a click: browsers ask for the microphone. */
  start: () => void
  /** Stop and keep the words heard so far. */
  stop: () => void
  /** Clear the transcript. */
  reset: () => void
}

// The parts of the Web Speech API used here; browsers ship it as SpeechRecognition or with a
// webkit prefix.
type Recognition = EventTarget & {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
}
type ResultEvent = Event & {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}
type RecognitionClass = new () => Recognition

const RecognitionClass = (): RecognitionClass | undefined => {
  const w = window as {
    SpeechRecognition?: RecognitionClass
    webkitSpeechRecognition?: RecognitionClass
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}
const subscribeNothing = () => () => {}

/**
 * Turns speech from the microphone into text with the browser's built-in
 * speech recognition: the final transcript, the words still being
 * recognized, and whether it is listening.
 *
 * Works in Chrome, Edge, and Safari; `supported` is `false` in Firefox.
 * Chrome sends the audio to Google's servers to recognize it, so it needs a
 * connection. Recognition stops by itself after a pause unless `continuous`
 * is set, and always on unmount.
 *
 * Use when: dictation into a search box, chat input, or note, as an
 * optional extra next to typing.
 * Don't use when: you need it in every browser, offline, or with consistent
 * accuracy; record audio with `useMediaRecorder` and send it to a
 * transcription API. Don't make it the only way to enter text.
 *
 * Other libraries call this `useSpeechToText`, `react-speech-recognition`, `useVoice`.
 *
 * @param options - `lang`, `continuous`. Optional.
 * @returns `{ supported, listening, transcript, interim, error, start, stop, reset }`.
 *
 * @example
 * const speech = useSpeechRecognition({ lang: 'en-US' })
 * useEffect(() => {
 *   if (speech.transcript) setQuery(speech.transcript)
 * }, [speech.transcript])
 * if (!speech.supported) return null
 * return (
 *   <button onClick={speech.listening ? speech.stop : speech.start}>
 *     {speech.listening ? 'Stop' : '🎤 Dictate'}
 *   </button>
 * )
 */
export function useSpeechRecognition(
  options: SpeechRecognitionOptions = {},
): SpeechRecognitionState {
  const { lang, continuous = false } = options
  const supported = useSyncExternalStore(
    subscribeNothing,
    () => !!RecognitionClass(),
    () => false,
  )
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const active = useRef<Recognition | null>(null)

  const start = useCallback(() => {
    const Recognition = RecognitionClass()
    if (!Recognition || active.current) return
    const recognition = new Recognition()
    if (lang) recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = true
    recognition.addEventListener('result', (event) => {
      const { resultIndex, results } = event as ResultEvent
      let final = ''
      let pending = ''
      for (let i = resultIndex; i < results.length; i++) {
        const result = results[i]!
        if (result.isFinal) final += result[0]!.transcript
        else pending += result[0]!.transcript
      }
      if (final) setTranscript((prev) => `${prev} ${final}`.trim())
      setInterim(pending.trim())
    })
    recognition.addEventListener('error', (event) =>
      setError((event as Event & { error?: string }).error ?? 'error'),
    )
    recognition.addEventListener('end', () => {
      active.current = null
      setListening(false)
      setInterim('')
    })
    active.current = recognition
    setError(null)
    setListening(true)
    recognition.start()
  }, [lang, continuous])

  const stop = useCallback(() => active.current?.stop(), [])
  const reset = useCallback(() => {
    setTranscript('')
    setInterim('')
  }, [])

  // The ref object is stable; at unmount we want whatever recognition is running then.
  useEffect(() => {
    const ref = active
    return () => ref.current?.abort()
  }, [])

  return useMemo(
    () => ({ supported, listening, transcript, interim, error, start, stop, reset }),
    [supported, listening, transcript, interim, error, start, stop, reset],
  )
}
