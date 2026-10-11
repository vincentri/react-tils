import { act, createElement } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useSearchParam } from './useSearchParam'

let param: ReturnType<typeof useSearchParam>
const Tab = ({ serverValue = null }: { serverValue?: string | null }) => {
  param = useSearchParam('tab', serverValue)
  return param[0] ?? '(none)'
}

afterEach(() => {
  history.replaceState(null, '', '/')
  Reflect.deleteProperty(window, 'navigation')
})

async function mount() {
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () => root.render(createElement(Tab)))
  return { text: () => container.textContent, unmount: () => act(async () => root.unmount()) }
}

describe('useSearchParam', () => {
  hookMatrix(() => useSearchParam('tab'))

  it('renders the request value on the server and hydrates to it with no mismatch', async () => {
    history.replaceState(null, '', '/?tab=billing')
    const html = renderToString(createElement(Tab, { serverValue: 'billing' }))
    expect(html).toBe('billing')
    const container = document.createElement('div')
    container.innerHTML = html
    const errors = vi.fn<(error: unknown) => void>()
    const root = await act(async () =>
      hydrateRoot(container, createElement(Tab, { serverValue: 'billing' }), {
        onRecoverableError: errors,
      }),
    )
    expect(container.textContent).toBe('billing')
    expect(errors).not.toHaveBeenCalled()
    await act(async () => root.unmount())
  })

  it("sets, replaces or pushes, removes, and keeps other params, the hash, and a router's history.state", async () => {
    history.replaceState({ router: 'state', __NA: true }, '', '/page?sort=new#top')
    const a = await mount()
    const b = await mount()
    const entries = history.length

    await act(async () => param[1]('a b&c'))
    expect(location.search).toBe('?sort=new&tab=a+b%26c')
    expect(location.hash).toBe('#top')
    // Next.js's marker is dropped, or Next ignores the change (see the Next.js e2e test).
    expect(history.state).toEqual({ router: 'state' })
    expect(history.length).toBe(entries)
    expect(a.text()).toBe('a b&c')
    expect(b.text()).toBe('a b&c')

    await act(async () => param[1]('billing', { push: true }))
    expect(history.length).toBe(entries + 1)

    await act(async () => param[1](null))
    expect(location.search).toBe('?sort=new')
    expect(a.text()).toBe('(none)')
    await a.unmount()
    await b.unmount()
  })

  it('follows Back and Forward, and router navigation through the Navigation API', async () => {
    const navigation = new EventTarget()
    Object.defineProperty(window, 'navigation', { configurable: true, value: navigation })
    const view = await mount()

    history.pushState(null, '', '/?tab=team') // a router's own navigation fires nothing
    await act(async () => navigation.dispatchEvent(new Event('currententrychange')))
    expect(view.text()).toBe('team')

    history.replaceState(null, '', '/?tab=profile')
    await act(async () => window.dispatchEvent(new PopStateEvent('popstate')))
    expect(view.text()).toBe('profile')
    await view.unmount()
  })
})
