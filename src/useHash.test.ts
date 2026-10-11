import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { hookMatrix } from './testing'
import { useHash } from './useHash'

const Server = () => useHash('#billing')[0]

let setHash: (hash: string) => void
const Hash = () => {
  const [hash, set] = useHash()
  setHash = set
  return hash || '(none)'
}

afterEach(() => {
  history.replaceState(null, '', '/')
  Reflect.deleteProperty(window, 'navigation')
})

async function mount() {
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () => root.render(createElement(Hash)))
  return { text: () => container.textContent, unmount: () => act(async () => root.unmount()) }
}

describe('useHash', () => {
  hookMatrix(() => useHash())

  it('uses serverValue on the server', () => {
    expect(renderToString(createElement(Server))).toBe('#billing')
  })

  it('reads the hash, follows hashchange, and sets it', async () => {
    history.replaceState(null, '', '#intro')
    const view = await mount()
    expect(view.text()).toBe('#intro')

    history.replaceState(null, '', '#faq')
    await act(async () => window.dispatchEvent(new HashChangeEvent('hashchange')))
    expect(view.text()).toBe('#faq')

    await act(async () => setHash('billing'))
    expect(location.hash).toBe('#billing')
    await act(async () => window.dispatchEvent(new HashChangeEvent('hashchange')))
    expect(view.text()).toBe('#billing')
    await view.unmount()
  })

  it('follows pushState through the Navigation API', async () => {
    const navigation = new EventTarget()
    Object.defineProperty(window, 'navigation', { configurable: true, value: navigation })
    const view = await mount()
    expect(view.text()).toBe('(none)')

    history.pushState(null, '', '#pricing') // fires no hashchange
    await act(async () => navigation.dispatchEvent(new Event('currententrychange')))
    expect(view.text()).toBe('#pricing')
    await view.unmount()
  })
})
