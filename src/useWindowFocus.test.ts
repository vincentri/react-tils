import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useWindowFocus } from './useWindowFocus'

const Focus = () => String(useWindowFocus())
const UnfocusedOnServer = () => String(useWindowFocus(false))

describe('useWindowFocus', () => {
  hookMatrix(() => useWindowFocus())

  it('uses serverValue on the server', () => {
    expect(renderToString(createElement(UnfocusedOnServer))).toBe('false')
  })

  it('follows focus and blur', async () => {
    const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Focus)))
    expect(container.textContent).toBe('true')

    hasFocus.mockReturnValue(false)
    await act(async () => window.dispatchEvent(new Event('blur')))
    expect(container.textContent).toBe('false')

    hasFocus.mockReturnValue(true)
    await act(async () => window.dispatchEvent(new Event('focus')))
    expect(container.textContent).toBe('true')

    await act(async () => root.unmount())
  })
})
