import { act, createElement } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { useCookie } from './useCookie'

type Setter = ReturnType<typeof useCookie>
let cookie: Setter
const Theme = ({ serverValue }: { serverValue?: string | null | undefined }) => {
  cookie = useCookie('theme', serverValue ?? null)
  return cookie[0] ?? 'none'
}

const clear = () => {
  for (const pair of document.cookie.split('; ').filter(Boolean)) {
    document.cookie = `${pair.split('=')[0]}=; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  }
}
afterEach(() => {
  clear()
  Reflect.deleteProperty(window, 'cookieStore')
})

async function mount(serverValue?: string | null) {
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () => root.render(createElement(Theme, { serverValue })))
  return { text: () => container.textContent, unmount: () => act(async () => root.unmount()) }
}

describe('useCookie', () => {
  hookMatrix(() => useCookie('theme'))

  it('renders the request value on the server and hydrates to the same value with no mismatch', async () => {
    document.cookie = 'theme=dark; path=/'
    const html = renderToString(createElement(Theme, { serverValue: 'dark' }))
    expect(html).toBe('dark')
    const container = document.createElement('div')
    container.innerHTML = html
    const errors = vi.fn<(error: unknown) => void>()
    const root = await act(async () =>
      hydrateRoot(container, createElement(Theme, { serverValue: 'dark' }), {
        onRecoverableError: errors,
      }),
    )
    expect(container.textContent).toBe('dark')
    expect(errors).not.toHaveBeenCalled()
    await act(async () => root.unmount())
  })

  it('reads, sets, and removes, updating every component on the same cookie', async () => {
    const a = await mount()
    const b = await mount()
    expect(a.text()).toBe('none')

    await act(async () => cookie[1]('light & airy', { maxAgeSeconds: 60 }))
    expect(document.cookie).toContain('theme=light%20%26%20airy')
    expect(a.text()).toBe('light & airy')
    expect(b.text()).toBe('light & airy')

    await act(async () => cookie[2]())
    expect(a.text()).toBe('none')
    await a.unmount()
    await b.unmount()
  })

  it("doesn't crash on cookies that aren't URL-encoded, set by the server or other scripts", async () => {
    document.cookie = '%E0%A4%A=broken; path=/'
    document.cookie = 'theme=100%; path=/'
    const view = await mount()
    expect(view.text()).toBe('100%')
    await view.unmount()
  })

  it('follows changes made elsewhere: Cookie Store change events, and on window focus', async () => {
    const store = new EventTarget()
    Object.defineProperty(window, 'cookieStore', { configurable: true, value: store })
    const view = await mount()

    document.cookie = 'theme=from-server; path=/' // e.g. a fetch response's Set-Cookie
    await act(async () => store.dispatchEvent(new Event('change')))
    expect(view.text()).toBe('from-server')

    document.cookie = 'theme=other-tab; path=/'
    await act(async () => window.dispatchEvent(new Event('focus')))
    expect(view.text()).toBe('other-tab')
    await view.unmount()
  })
})
