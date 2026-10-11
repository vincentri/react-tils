import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

export type SpeakOptions = {
  /** One of `voices`. Default: the browser's default voice for `lang`. */
  voice?: SpeechSynthesisVoice | null
  /** BCP 47 language, e.g. `'en-US'`. Default: the page's language. */
  lang?: string
  /** 0.1 to 10. Default `1`. */
  rate?: number
  /** 0 to 2. Default `1`. */
  pitch?: number
  /** 0 to 1. Default `1`. */
  volume?: number
}

export type SpeechSynthesisState = {
  /** `false` on the server, during hydration, and in browsers without speech synthesis. */
  supported: boolean
  /** Installed voices. Empty on the server and until the browser has loaded them. */
  voices: SpeechSynthesisVoice[]
  speaking: boolean
  /** Read `text` aloud. The browser has one speech queue, so this stops anything the page was reading. */
  speak: (text: string, options?: SpeakOptions) => void
  /** Stop reading. */
  cancel: () => void
}

const NO_VOICES: SpeechSynthesisVoice[] = []
let cachedVoices = NO_VOICES
let cachedKey = ''

const hasSpeech = () => typeof speechSynthesis !== 'undefined'
const subscribeNothing = () => () => {}

function subscribeVoices(onChange: () => void) {
  if (!hasSpeech()) return () => {}
  speechSynthesis.addEventListener('voiceschanged', onChange)
  return () => speechSynthesis.removeEventListener('voiceschanged', onChange)
}

// getVoices() returns a new array every call; keep the same one until the list changes.
function getVoices(): SpeechSynthesisVoice[] {
  if (!hasSpeech()) return NO_VOICES
  const voices = speechSynthesis.getVoices()
  const key = voices.map((voice) => voice.voiceURI).join('\n')
  if (key !== cachedKey) {
    cachedKey = key
    cachedVoices = voices.length > 0 ? voices : NO_VOICES
  }
  return cachedVoices
}

// Chrome stops speaking after about 15 seconds of one utterance, so long text is read in parts
// split at sentence ends, or at spaces for very long sentences.
function chunks(text: string, max = 200): string[] {
  const parts: string[] = []
  let current = ''
  for (const word of text.trim().split(/\s+/)) {
    if (current && current.length + word.length + 1 > max) {
      parts.push(current)
      current = word
    } else {
      current = current ? `${current} ${word}` : word
    }
    if (/[.!?]$/.test(word) && current.length > max / 2) {
      parts.push(current)
      current = ''
    }
  }
  if (current) parts.push(current)
  return parts
}

/**
 * Reads text aloud with the browser's speech synthesis, with the voice list
 * and whether it is speaking.
 *
 * Handles the browser quirks: voices load after the page (the list is empty
 * at first and fills in with a re-render), Chrome stops long text after about
 * 15 seconds (text is read in sentence-sized parts), and Chrome can garbage
 * collect an utterance mid-sentence so its end never fires (they are kept
 * until done). Stops on unmount.
 *
 * Use when: a "Read aloud" button for AI answers, articles, or lessons, or
 * spoken feedback in a hands-free flow.
 * Don't use when: you need natural, consistent voices across devices;
 * generate audio with a text-to-speech API and play it. Voices differ by
 * browser and operating system.
 *
 * Other libraries call this `useSpeech`, `useTextToSpeech`, `react-speech-kit`.
 *
 * @returns `{ supported, voices, speaking, speak, cancel }`.
 *
 * @example
 * const { supported, speaking, speak, cancel } = useSpeechSynthesis()
 * if (!supported) return null
 * return speaking
 *   ? <button onClick={cancel}>Stop</button>
 *   : <button onClick={() => speak(answer, { rate: 1.1 })}>Read aloud</button>
 */
export function useSpeechSynthesis(): SpeechSynthesisState {
  const supported = useSyncExternalStore(subscribeNothing, hasSpeech, () => false)
  const voices = useSyncExternalStore(subscribeVoices, getVoices, () => NO_VOICES)
  const [speaking, setSpeaking] = useState(false)
  // Utterances this hook queued; kept so Chrome can't collect them before they end.
  const queued = useRef<SpeechSynthesisUtterance[]>([])

  const cancel = useCallback(() => {
    if (queued.current.length === 0) return
    queued.current = []
    if (hasSpeech()) speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      if (!hasSpeech()) return
      cancel()
      const parts = chunks(text)
      const utterances = parts.map((part, i) => {
        const utterance = new SpeechSynthesisUtterance(part)
        // The option names match the utterance's properties; unset ones keep the defaults.
        for (const [key, value] of Object.entries(options))
          if (value != null && value !== '') Object.assign(utterance, { [key]: value })
        if (i === 0) utterance.addEventListener('start', () => setSpeaking(true))
        const done = () => {
          if (!queued.current.includes(utterance)) return
          queued.current = queued.current.filter((u) => u !== utterance)
          if (queued.current.length === 0) setSpeaking(false)
        }
        utterance.addEventListener('end', done)
        utterance.addEventListener('error', done)
        return utterance
      })
      queued.current = utterances
      for (const utterance of utterances) speechSynthesis.speak(utterance)
    },
    [cancel],
  )

  useEffect(() => cancel, [cancel])

  return useMemo(
    () => ({ supported, voices, speaking, speak, cancel }),
    [supported, voices, speaking, speak, cancel],
  )
}
