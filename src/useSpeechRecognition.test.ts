import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { type SpeechRecognitionState, useSpeechRecognition } from './useSpeechRecognition'

class FakeRecognition extends EventTarget {
  static last: FakeRecognition | null = null
  lang = ''
  continuous = false
  interimResults = false
  start = vi.fn<() => void>()
  stop = vi.fn<() => void>(() => this.dispatchEvent(new Event('end')))
  abort = vi.fn<() => void>()
  constructor() {
    super()
    FakeRecognition.last = this
  }
  // Results as the browser sends them: everything since resultIndex, final or not.
  hear(resultIndex: number, results: [string, boolean][]) {
    const list = results.map(([transcript, isFinal]) =>
      Object.assign([{ transcript }], { isFinal }),
    )
    this.dispatchEvent(Object.assign(new Event('result'), { resultIndex, results: list }))
  }
}

let speech: SpeechRecognitionState
const Dictation = () => {
  speech = useSpeechRecognition({ lang: 'en-US', continuous: true })
  return null
}

async function mount() {
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(createElement(Dictation)))
  return () => act(async () => root.unmount())
}

afterEach(() => vi.unstubAllGlobals())

describe('useSpeechRecognition', () => {
  hookMatrix(() => useSpeechRecognition())

  describe('in a browser with the webkit-prefixed API', () => {
    beforeEach(() => vi.stubGlobal('webkitSpeechRecognition', FakeRecognition))

    it('builds the transcript from final results and shows interim words until they settle', async () => {
      const unmount = await mount()
      expect(speech.supported).toBe(true)
      act(() => speech.start())
      const recognition = FakeRecognition.last!
      expect(recognition).toMatchObject({ lang: 'en-US', continuous: true, interimResults: true })
      expect(speech.listening).toBe(true)

      act(() => recognition.hear(0, [['hello wor', false]]))
      expect(speech.interim).toBe('hello wor')
      act(() => recognition.hear(0, [['hello world', true]]))
      act(() =>
        recognition.hear(1, [
          ['hello world', true],
          [' how are', false],
        ]),
      )
      expect(speech.transcript).toBe('hello world')
      expect(speech.interim).toBe('how are')

      act(() => speech.stop())
      expect(speech.listening).toBe(false)
      expect(speech.interim).toBe('')
      act(() => speech.reset())
      expect(speech.transcript).toBe('')
      await unmount()
    })

    it('reports errors such as a blocked microphone, and aborts on unmount', async () => {
      const unmount = await mount()
      act(() => speech.start())
      const recognition = FakeRecognition.last!
      act(() =>
        recognition.dispatchEvent(Object.assign(new Event('error'), { error: 'not-allowed' })),
      )
      expect(speech.error).toBe('not-allowed')
      await unmount()
      expect(recognition.abort).toHaveBeenCalled()
    })
  })

  it('is unsupported where the browser has no speech recognition', async () => {
    const unmount = await mount()
    expect(speech.supported).toBe(false)
    act(() => speech.start())
    expect(speech.listening).toBe(false)
    await unmount()
  })
})
