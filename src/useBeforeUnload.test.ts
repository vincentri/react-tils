import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { hookMatrix } from './testing'
import { useBeforeUnload } from './useBeforeUnload'

const Guard = ({ when }: { when: boolean }) => {
  useBeforeUnload(when)
  return null
}

const unload = () => {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

describe('useBeforeUnload', () => {
  hookMatrix(() => useBeforeUnload())

  it('asks for confirmation only while `when` is true', async () => {
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Guard, { when: false })))
    expect(unload()).toBe(false)

    await act(async () => root.render(createElement(Guard, { when: true })))
    expect(unload()).toBe(true)

    await act(async () => root.unmount())
    expect(unload()).toBe(false)
  })
})
