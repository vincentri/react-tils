import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { componentMatrix } from './testing'
import { useClickOutside } from './useClickOutside'

const Menu = ({ onOutside, enabled }: { onOutside: () => void; enabled?: boolean }) => {
  const ref = useClickOutside<HTMLDivElement>(onOutside, enabled)
  return createElement('div', { ref, id: 'menu' }, createElement('button', { id: 'inside' }))
}
const Default = () => Menu({ onOutside: () => {} })

const press = (el: Element) =>
  act(async () => {
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
  })

async function mount(props: { onOutside: () => void; enabled?: boolean }) {
  const container = document.createElement('div')
  const outside = document.createElement('p')
  document.body.append(container, outside)
  const root = createRoot(container)
  await act(async () => root.render(createElement(Menu, props)))
  return {
    inside: container.querySelector('#inside')!,
    outside,
    unmount: async () => {
      await act(async () => root.unmount())
      container.remove()
      outside.remove()
    },
  }
}

describe('useClickOutside', () => {
  componentMatrix(Default)

  it('fires for presses outside, not inside', async () => {
    const onOutside = vi.fn<() => void>()
    const view = await mount({ onOutside })
    await press(view.inside)
    expect(onOutside).not.toHaveBeenCalled()
    await press(view.outside)
    expect(onOutside).toHaveBeenCalledTimes(1)
    await view.unmount()
  })

  it('does nothing while disabled', async () => {
    const onOutside = vi.fn<() => void>()
    const view = await mount({ onOutside, enabled: false })
    await press(view.outside)
    expect(onOutside).not.toHaveBeenCalled()
    await view.unmount()
  })
})
