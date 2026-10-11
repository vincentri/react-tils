import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { type SpeechSynthesisState, useSpeechSynthesis } from './useSpeechSynthesis'

class FakeUtterance extends EventTarget {
  voice: SpeechSynthesisVoice | null = null
  lang = ''
  rate = 1
  pitch = 1
  volume = 1
  constructor(public text: string) {
    super()
  }
}

// One speech queue, like the browser's. Voices arrive later, with a `voiceschanged` event.
function fakeSpeech() {
  let voices: SpeechSynthesisVoice[] = []
  const queue: FakeUtterance[] = []
  const synth = Object.assign(new EventTarget(), {
    getVoices: () => [...voices],
    speak: vi.fn<(u: FakeUtterance) => void>((u) => void queue.push(u)),
    cancel: vi.fn<() => void>(() => void queue.splice(0)),
  })
  vi.stubGlobal('speechSynthesis', synth)
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  return {
    synth,
    queue,
    loadVoices(list: Partial<SpeechSynthesisVoice>[]) {
      voices = list as SpeechSynthesisVoice[]
      synth.dispatchEvent(new Event('voiceschanged'))
    },
    // The browser reads the queue in order: start, then end, for each utterance.
    finishAll() {
      for (const u of queue.splice(0)) {
        u.dispatchEvent(new Event('start'))
        u.dispatchEvent(new Event('end'))
      }
    },
  }
}

let speech: SpeechSynthesisState
const Reader = () => {
  speech = useSpeechSynthesis()
  return null
}

afterEach(() => vi.unstubAllGlobals())

describe('useSpeechSynthesis', () => {
  hookMatrix(() => useSpeechSynthesis())

  describe('with a browser that speaks', () => {
    let fake: ReturnType<typeof fakeSpeech>
    beforeEach(() => {
      fake = fakeSpeech()
    })

    it('fills in voices when they load, and keeps the same list until it changes', async () => {
      const root = createRoot(document.createElement('div'))
      await act(async () => root.render(createElement(Reader)))
      expect(speech.supported).toBe(true)
      expect(speech.voices).toEqual([])

      await act(async () => fake.loadVoices([{ voiceURI: 'a', name: 'Alex' }]))
      const loaded = speech.voices
      expect(loaded.map((v) => v.name)).toEqual(['Alex'])
      await act(async () => fake.synth.dispatchEvent(new Event('voiceschanged')))
      expect(speech.voices).toBe(loaded)
      await act(async () => root.unmount())
    })

    it('reads long text in parts, reports speaking until the last part ends, and applies options', async () => {
      const root = createRoot(document.createElement('div'))
      await act(async () => root.render(createElement(Reader)))
      const sentence = 'This sentence is about sixty characters long for testing. '
      act(() => speech.speak(sentence.repeat(10), { rate: 1.5, lang: 'en-GB' }))
      expect(fake.queue.length).toBeGreaterThan(1)
      expect(fake.queue.every((u) => u.text.length <= 200)).toBe(true)
      expect(fake.queue.map((u) => u.text).join(' ')).toBe(sentence.repeat(10).trim())
      expect(fake.queue[0]).toMatchObject({ rate: 1.5, lang: 'en-GB' })

      act(() => fake.queue[0]!.dispatchEvent(new Event('start')))
      expect(speech.speaking).toBe(true)
      act(() => fake.finishAll())
      expect(speech.speaking).toBe(false)
      await act(async () => root.unmount())
    })

    it('cancel stops reading, a new speak replaces the old one, and unmount stops it', async () => {
      const root = createRoot(document.createElement('div'))
      await act(async () => root.render(createElement(Reader)))
      act(() => speech.speak('First.'))
      act(() => fake.queue[0]!.dispatchEvent(new Event('start')))
      act(() => speech.speak('Second.'))
      expect(fake.synth.cancel).toHaveBeenCalledTimes(1)
      expect(speech.speaking).toBe(false)

      act(() => speech.cancel())
      expect(fake.synth.cancel).toHaveBeenCalledTimes(2)
      act(() => speech.speak('Third.'))
      await act(async () => root.unmount())
      expect(fake.synth.cancel).toHaveBeenCalledTimes(3)
    })
  })
})
