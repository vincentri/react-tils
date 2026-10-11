import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { componentMatrix } from './testing'
import { type Fullscreen, useFullscreen } from './useFullscreen'

let fullscreen: Fullscreen
const Viewer = () => {
  const [ref, fs] = useFullscreen<HTMLDivElement>()
  fullscreen = fs
  return createElement('div', { ref, id: 'viewer' }, String(fs.active))
}

// happy-dom has no fullscreen support: fake the document side and drive fullscreenchange.
function define(target: object, name: string, descriptor: PropertyDescriptor) {
  Object.defineProperty(target, name, { configurable: true, ...descriptor })
}

function fakeFullscreen(enabled = true) {
  let current: Element | null = null
  define(document, 'fullscreenEnabled', { get: () => enabled })
  define(document, 'fullscreenElement', { get: () => current })
  const change = (el: Element | null) => {
    current = el
    document.dispatchEvent(new Event('fullscreenchange'))
  }
  define(document, 'exitFullscreen', { value: async () => change(null) })
  define(Element.prototype, 'requestFullscreen', {
    value: async function (this: Element) {
      change(this)
    },
  })
  return { change }
}

afterEach(() => {
  for (const name of ['fullscreenEnabled', 'fullscreenElement', 'exitFullscreen'])
    Reflect.deleteProperty(document, name)
  Reflect.deleteProperty(Element.prototype, 'requestFullscreen')
})

describe('useFullscreen', () => {
  componentMatrix(Viewer)

  it('enters, exits, toggles, and follows Esc', async () => {
    const fake = fakeFullscreen()
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(createElement(Viewer)))
    expect(fullscreen.supported).toBe(true)
    expect(container.textContent).toBe('false')

    let entered = false
    await act(async () => {
      entered = await fullscreen.enter()
    })
    expect(entered).toBe(true)
    expect(container.textContent).toBe('true')

    await act(async () => fake.change(null)) // user pressed Esc
    expect(container.textContent).toBe('false')

    await act(async () => fullscreen.toggle())
    expect(container.textContent).toBe('true')
    await act(async () => fullscreen.toggle())
    expect(container.textContent).toBe('false')

    await act(async () => root.unmount())
  })

  it('is unsupported and refuses to enter without the Fullscreen API', async () => {
    fakeFullscreen(false)
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(createElement(Viewer)))
    expect(fullscreen.supported).toBe(false)
    expect(await fullscreen.enter()).toBe(false)
    await act(async () => root.unmount())
  })
})
