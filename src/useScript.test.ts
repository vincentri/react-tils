import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { type ScriptOptions, useScript } from './useScript'

// Capture appended scripts instead of letting happy-dom fetch them.
function captureScripts() {
  const appended: HTMLScriptElement[] = []
  vi.spyOn(document.head, 'append').mockImplementation((...nodes) => {
    appended.push(...(nodes as HTMLScriptElement[]))
  })
  return appended
}

const Status = ({ src, options }: { src: string; options?: ScriptOptions }) =>
  useScript(src, options)

async function mount(src: string, count = 1, options?: ScriptOptions) {
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () =>
    root.render(
      Array.from({ length: count }, (_, i) =>
        createElement(Status, { key: i, src, ...(options && { options }) }),
      ),
    ),
  )
  return { container, unmount: () => act(async () => root.unmount()) }
}

afterEach(() => {
  for (const s of document.querySelectorAll('script')) s.remove()
})

describe('useScript', () => {
  // Disabled: an enabled script keeps its load listeners until the network answers,
  // which the leak check would report. Loading is covered below.
  hookMatrix(() => useScript('https://cdn.example.com/matrix.js', { enabled: false }))

  // Each test uses its own src: the cache lives for the whole page.
  it('adds one shared tag with attributes, and reports loading then ready', async () => {
    const appended = captureScripts()
    const view = await mount('https://cdn.example.com/a.js', 2, { attributes: { nonce: 'abc' } })
    expect(view.container.textContent).toBe('loadingloading')
    expect(appended).toHaveLength(1)
    expect(appended[0]!.getAttribute('nonce')).toBe('abc')
    expect(appended[0]!.async).toBe(true)

    await act(async () => appended[0]!.dispatchEvent(new Event('load')))
    expect(view.container.textContent).toBe('readyready')
    await view.unmount()

    const again = await mount('https://cdn.example.com/a.js')
    expect(again.container.textContent).toBe('ready')
    expect(appended).toHaveLength(1)
    await again.unmount()
  })

  it('reports error', async () => {
    const appended = captureScripts()
    const view = await mount('https://cdn.example.com/broken.js')
    await act(async () => appended[0]!.dispatchEvent(new Event('error')))
    expect(view.container.textContent).toBe('error')
    await view.unmount()
  })

  it('treats a matching script already in the page as ready, and stays idle while disabled', async () => {
    const existing = document.createElement('script')
    existing.src = 'https://cdn.example.com/server.js'
    document.body.append(existing)
    const appended = captureScripts()
    const view = await mount('https://cdn.example.com/server.js')
    expect(view.container.textContent).toBe('ready')
    expect(appended).toHaveLength(0)
    await view.unmount()

    const off = await mount('https://cdn.example.com/later.js', 1, { enabled: false })
    expect(off.container.textContent).toBe('idle')
    expect(appended).toHaveLength(0)
    await off.unmount()
  })
})
