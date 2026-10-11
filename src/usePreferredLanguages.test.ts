import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { usePreferredLanguages } from './usePreferredLanguages'

const SERVER = ['de-DE', 'de']
let last: readonly string[] = []
const Languages = () => {
  last = usePreferredLanguages()
  return last.join(',')
}
const GermanOnServer = () => usePreferredLanguages(SERVER).join(',')

describe('usePreferredLanguages', () => {
  hookMatrix(() => usePreferredLanguages())

  it('uses serverValue on the server', () => {
    expect(renderToString(createElement(GermanOnServer))).toBe('de-DE,de')
  })

  it('follows languagechange and keeps the same array when unchanged', async () => {
    const languages = vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US', 'en'])
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Languages)))
    expect(container.textContent).toBe('en-US,en')
    const first = last

    languages.mockReturnValue(['en-US', 'en']) // new array, same content
    await act(async () => window.dispatchEvent(new Event('languagechange')))
    expect(last).toBe(first)

    languages.mockReturnValue(['fr-FR', 'fr'])
    await act(async () => window.dispatchEvent(new Event('languagechange')))
    expect(container.textContent).toBe('fr-FR,fr')

    await act(async () => root.unmount())
  })
})
