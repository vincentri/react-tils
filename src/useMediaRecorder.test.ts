import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { type MediaRecorderState, useMediaRecorder } from './useMediaRecorder'

// A recorder that, like Safari, can only record MP4; stop delivers the last chunk, then stops.
class FakeRecorder extends EventTarget {
  static instances: FakeRecorder[] = []
  static isTypeSupported = (type: string) => type === 'audio/mp4'
  state: RecordingState = 'inactive'
  mimeType: string
  constructor(
    public stream: MediaStream,
    options?: MediaRecorderOptions,
  ) {
    super()
    this.mimeType = options?.mimeType ?? ''
    FakeRecorder.instances.push(this)
  }
  start() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    this.dispatchEvent(
      Object.assign(new Event('dataavailable'), { data: new Blob(['last chunk']) }),
    )
    this.dispatchEvent(new Event('stop'))
  }
}

const audioStream = { getVideoTracks: () => [] } as unknown as MediaStream

let recorder: MediaRecorderState
const Recorder = ({ stream }: { stream: MediaStream | null }) => {
  recorder = useMediaRecorder(stream)
  return null
}

beforeEach(() => {
  FakeRecorder.instances = []
  vi.stubGlobal('MediaRecorder', FakeRecorder)
})
afterEach(() => vi.unstubAllGlobals())

async function mount(stream: MediaStream | null) {
  const root = createRoot(document.createElement('div'))
  const render = (next: MediaStream | null) =>
    act(async () => root.render(createElement(Recorder, { stream: next })))
  await render(stream)
  return { render, unmount: () => act(async () => root.unmount()) }
}

describe('useMediaRecorder', () => {
  hookMatrix(() => useMediaRecorder(null))

  it('records in the first format the browser supports, and stop resolves with the last chunk', async () => {
    const view = await mount(audioStream)
    expect(recorder.supported).toBe(true)
    act(() => recorder.start())
    expect(recorder.recording).toBe(true)
    expect(recorder.mimeType).toBe('audio/mp4') // webm isn't supported here, as in Safari

    let blob: Blob | null = null
    await act(async () => {
      blob = await recorder.stop()
    })
    expect(blob).toBeInstanceOf(Blob)
    expect(await blob!.text()).toBe('last chunk')
    expect(blob!.type).toBe('audio/mp4')
    expect(recorder.blob).toBe(blob)
    expect(recorder.recording).toBe(false)
    await view.unmount()
  })

  it('does nothing without a stream, and drops a recording cut off by a new stream or unmount', async () => {
    const view = await mount(null)
    act(() => recorder.start())
    expect(FakeRecorder.instances).toHaveLength(0)

    await view.render(audioStream)
    act(() => recorder.start())
    await act(async () => void (await recorder.stop()))
    const kept = recorder.blob
    expect(kept).not.toBeNull()

    act(() => recorder.start())
    const cutOff = FakeRecorder.instances.at(-1)!
    await view.render({ getVideoTracks: () => [] } as unknown as MediaStream)
    expect(cutOff.state).toBe('inactive') // stopped with the old stream
    expect(recorder.blob).toBe(kept) // and not kept as the result
    expect(recorder.recording).toBe(false)

    act(() => recorder.start())
    const last = FakeRecorder.instances.at(-1)!
    await view.unmount()
    expect(last.state).toBe('inactive')
  })
})
