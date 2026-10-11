import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useOnline } from './useOnline'

const Online = () => String(useOnline())
const OfflineOnServer = () => String(useOnline(false))

describe('useOnline', () => {
  hookMatrix(() => useOnline())

  it('uses serverValue on the server', () => {
    expect(renderToString(createElement(OfflineOnServer))).toBe('false')
  })

  it('follows online and offline events', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Online)))
    expect(container.textContent).toBe('true')

    onLine.mockReturnValue(false)
    await act(async () => window.dispatchEvent(new Event('offline')))
    expect(container.textContent).toBe('false')

    onLine.mockReturnValue(true)
    await act(async () => window.dispatchEvent(new Event('online')))
    expect(container.textContent).toBe('true')

    await act(async () => root.unmount())
  })
})
