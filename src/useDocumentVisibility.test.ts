import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useDocumentVisibility } from './useDocumentVisibility'

const Visibility = () => useDocumentVisibility()
const HiddenOnServer = () => useDocumentVisibility('hidden')

describe('useDocumentVisibility', () => {
  hookMatrix(() => useDocumentVisibility())

  it('uses serverValue on the server', () => {
    expect(renderToString(createElement(HiddenOnServer))).toBe('hidden')
  })

  it('follows visibilitychange', async () => {
    const state = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Visibility)))
    expect(container.textContent).toBe('visible')

    state.mockReturnValue('hidden')
    await act(async () => document.dispatchEvent(new Event('visibilitychange')))
    expect(container.textContent).toBe('hidden')

    await act(async () => root.unmount())
  })
})
