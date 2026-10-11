import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { componentMatrix } from './testing'
import { type RovingFocusOptions, useRovingFocus } from './useRovingFocus'

type Props = { options?: RovingFocusOptions; selectedIndex?: number; extra?: boolean }
const Toolbar = ({ options, selectedIndex, extra }: Props) => {
  const ref = useRovingFocus<HTMLDivElement>(options)
  const button = (id: string, i: number, disabled = false) =>
    createElement(
      'button',
      {
        key: id,
        id,
        disabled,
        'aria-selected': selectedIndex === undefined ? undefined : i === selectedIndex,
      },
      id,
    )
  return createElement(
    'div',
    { ref, role: 'toolbar' },
    button('a', 0),
    button('b', 1),
    button('off', 2, true),
    button('c', 3),
    extra ? button('d', 4) : null,
  )
}
const Default = () => createElement(Toolbar)
const el = (id: string) => document.getElementById(id)!

async function setup(props: Props = {}) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const render = (next: Props) => act(async () => root.render(createElement(Toolbar, next)))
  await render(props)
  return {
    el,
    render,
    tabStops: () =>
      ['a', 'b', 'c', 'd'].filter(
        (id) => document.getElementById(id)?.getAttribute('tabindex') === '0',
      ),
    focused: () => document.activeElement?.id,
    press: (key: string) =>
      act(async () => {
        document.activeElement!.dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        )
      }),
    cleanup: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

describe('useRovingFocus', () => {
  componentMatrix(Default)

  it('keeps one Tab stop, moves with arrows, skips disabled items, wraps, and jumps with Home/End', async () => {
    const view = await setup()
    expect(view.tabStops()).toEqual(['a'])
    expect(view.el('b').getAttribute('tabindex')).toBe('-1')

    view.el('a').focus()
    await view.press('ArrowDown')
    expect(view.focused()).toBe('b')
    expect(view.tabStops()).toEqual(['b'])

    await view.press('ArrowDown') // skips the disabled button
    expect(view.focused()).toBe('c')
    await view.press('ArrowDown') // wraps
    expect(view.focused()).toBe('a')
    await view.press('ArrowUp')
    expect(view.focused()).toBe('c')
    await view.press('Home')
    expect(view.focused()).toBe('a')
    await view.press('End')
    expect(view.focused()).toBe('c')

    await view.press('ArrowRight') // vertical by default: ignored
    expect(view.focused()).toBe('c')
    await view.cleanup()
  })

  it('uses Left/Right when horizontal, and stops at the ends without loop', async () => {
    const view = await setup({ options: { orientation: 'horizontal', loop: false } })
    view.el('a').focus()
    await view.press('ArrowRight')
    expect(view.focused()).toBe('b')
    await view.press('ArrowLeft')
    await view.press('ArrowLeft')
    expect(view.focused()).toBe('a')
    await view.cleanup()
  })

  it('starts at the selected item, includes items added later, and removes tabindex on unmount', async () => {
    const view = await setup({ selectedIndex: 1 })
    expect(view.tabStops()).toEqual(['b'])

    await view.render({ selectedIndex: 1, extra: true })
    expect(view.el('d').getAttribute('tabindex')).toBe('-1')
    expect(view.tabStops()).toEqual(['b'])

    const a = view.el('a')
    await view.cleanup()
    expect(a.hasAttribute('tabindex')).toBe(false)
  })
})
