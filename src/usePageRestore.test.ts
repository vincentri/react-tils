import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { usePageRestore } from './usePageRestore'

const Page = ({ onRestore }: { onRestore: () => void }) => {
  usePageRestore(onRestore)
  return null
}

const pageshow = (persisted: boolean) =>
  window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted }))

describe('usePageRestore', () => {
  hookMatrix(() => usePageRestore(() => {}))

  it('runs only when the page comes back from the back/forward cache', async () => {
    const onRestore = vi.fn<() => void>()
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Page, { onRestore })))

    await act(async () => pageshow(false)) // a normal load
    expect(onRestore).not.toHaveBeenCalled()
    await act(async () => pageshow(true))
    expect(onRestore).toHaveBeenCalledTimes(1)

    await act(async () => root.unmount())
    pageshow(true)
    expect(onRestore).toHaveBeenCalledTimes(1)
  })
})
