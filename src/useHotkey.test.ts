import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { hookMatrix } from './testing'
import { type HotkeyOptions, useHotkey } from './useHotkey'

const Hotkey = (props: { hotkey: string; onKey: () => void; options?: HotkeyOptions }) => {
  useHotkey(props.hotkey, props.onKey, props.options)
  return null
}

async function mount(hotkey: string, options?: HotkeyOptions) {
  const onKey = vi.fn<() => void>()
  const root = createRoot(document.createElement('div'))
  await act(async () =>
    root.render(createElement(Hotkey, { hotkey, onKey, ...(options && { options }) })),
  )
  return { onKey, unmount: () => act(async () => root.unmount()) }
}

const press = (init: KeyboardEventInit, target: EventTarget = document.body) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

// A keydown at a given time, as the sequence timer reads event.timeStamp.
const at = (key: string, time: number, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  Object.defineProperty(event, 'timeStamp', { value: time })
  document.body.dispatchEvent(event)
  return event
}

describe('useHotkey', () => {
  hookMatrix(() => useHotkey('mod+k', () => {}))

  it('matches mod as Ctrl off Apple devices and Cmd on them, with exact modifiers', async () => {
    const platform = vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32')
    const view = await mount('mod+k')
    press({ key: 'k' })
    press({ key: 'k', ctrlKey: true, shiftKey: true })
    expect(view.onKey).not.toHaveBeenCalled()
    const event = press({ key: 'K', ctrlKey: true })
    expect(view.onKey).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)

    platform.mockReturnValue('MacIntel')
    press({ key: 'k', ctrlKey: true })
    press({ key: 'k', metaKey: true })
    expect(view.onKey).toHaveBeenCalledTimes(2)
    await view.unmount()
  })

  it('ignores typing in inputs and IME composition, except Escape', async () => {
    const input = document.createElement('input')
    document.body.append(input)
    const slash = await mount('/')
    press({ key: '/' }, input)
    press({ key: '/', isComposing: true })
    expect(slash.onKey).not.toHaveBeenCalled()
    press({ key: '/' })
    expect(slash.onKey).toHaveBeenCalledTimes(1)
    await slash.unmount()

    const escape = await mount('esc')
    press({ key: 'Escape' }, input)
    expect(escape.onKey).toHaveBeenCalledTimes(1)
    await escape.unmount()
    input.remove()
  })

  it('does not enforce shift for symbols that need it', async () => {
    const view = await mount('?')
    press({ key: '?', shiftKey: true })
    expect(view.onKey).toHaveBeenCalledTimes(1)
    await view.unmount()
  })

  it('respects enabled and preventDefault', async () => {
    const off = await mount('a', { enabled: false })
    press({ key: 'a' })
    expect(off.onKey).not.toHaveBeenCalled()
    await off.unmount()

    const noPrevent = await mount('a', { preventDefault: false })
    expect(press({ key: 'a' }).defaultPrevented).toBe(false)
    expect(noPrevent.onKey).toHaveBeenCalledTimes(1)
    await noPrevent.unmount()
  })

  it('fires a sequence like "g i" only for the keys in order, each within a second', async () => {
    const view = await mount('g i')
    const first = at('g', 1000)
    expect(first.defaultPrevented).toBe(false) // a step on its way isn't a shortcut yet
    const last = at('i', 1500)
    expect(view.onKey).toHaveBeenCalledTimes(1)
    expect(last.defaultPrevented).toBe(true)

    at('g', 2000)
    at('x', 2100) // wrong key: starts over
    at('i', 2200)
    expect(view.onKey).toHaveBeenCalledTimes(1)

    at('g', 3000)
    at('i', 4200) // too slow
    expect(view.onKey).toHaveBeenCalledTimes(1)

    at('g', 5000)
    at('g', 5100) // a repeated first key restarts the sequence
    at('Shift', 5150) // a modifier alone isn't a step
    at('i', 5200)
    expect(view.onKey).toHaveBeenCalledTimes(2)
    await view.unmount()
  })
})
