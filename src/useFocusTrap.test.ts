import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { componentMatrix } from './testing'
import { useFocusTrap } from './useFocusTrap'

const Dialog = ({ open }: { open: boolean }) => {
  const ref = useFocusTrap<HTMLDivElement>(open)
  return open
    ? createElement(
        'div',
        { ref, id: 'dialog' },
        createElement('button', { id: 'first' }, 'first'),
        createElement('button', { id: 'disabled', disabled: true }, 'disabled'),
        createElement('input', { id: 'last' }),
      )
    : null
}
// Buttons only: happy-dom adds its own listener to a focused <input>, which the leak check
// would report. Inputs are covered in the real-browser e2e test.
const Open = () => {
  const ref = useFocusTrap<HTMLDivElement>(true)
  return createElement(
    'div',
    { ref },
    createElement('button', null, 'a'),
    createElement('button', null, 'b'),
  )
}

const tab = (shiftKey = false) => {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  })
  document.activeElement!.dispatchEvent(event)
  return event
}

async function setup() {
  const opener = document.createElement('button')
  opener.id = 'opener'
  const outside = document.createElement('button')
  const container = document.createElement('div')
  document.body.append(opener, outside, container)
  opener.focus()
  const root = createRoot(container)
  const render = (open: boolean) => act(async () => root.render(createElement(Dialog, { open })))
  await render(true)
  return {
    opener,
    outside,
    render,
    focused: () => document.activeElement?.id,
    cleanup: async () => {
      await act(async () => root.unmount())
      opener.remove()
      outside.remove()
      container.remove()
    },
  }
}

describe('useFocusTrap', () => {
  componentMatrix(Open)

  it('focuses the first element, moves and wraps with Tab and Shift+Tab, and skips disabled elements', async () => {
    const view = await setup()
    expect(view.focused()).toBe('first')

    document.getElementById('last')!.focus()
    expect(tab().defaultPrevented).toBe(true)
    expect(view.focused()).toBe('first')

    expect(tab(true).defaultPrevented).toBe(true)
    expect(view.focused()).toBe('last')

    // Moves through the list in DOM order, skipping the disabled button.
    document.getElementById('first')!.focus()
    tab()
    expect(view.focused()).toBe('last')
    await view.cleanup()
  })

  it('pulls focus back when it escapes, and restores the opener on close', async () => {
    const view = await setup()
    await act(async () => view.outside.focus())
    expect(view.focused()).toBe('first')

    await view.render(false)
    expect(view.focused()).toBe('opener')
    await view.cleanup()
  })
})
