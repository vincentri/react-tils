import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeObserver } from './test/observers'
import { fakeScroll } from './test/scroll'
import { componentMatrix } from './testing'
import { type StickToBottom, useStickToBottom } from './useStickToBottom'

let last: StickToBottom
const Chat = () => {
  const [ref, state] = useStickToBottom<HTMLDivElement>()
  last = state
  return createElement('div', { ref, id: 'chat' }, createElement('p', null, 'messages'))
}

afterEach(() => vi.unstubAllGlobals())

async function setup() {
  const ro = fakeObserver('ResizeObserver')
  const container = document.createElement('div')
  const root = createRoot(container)
  await act(async () => root.render(createElement(Chat)))
  const chat = container.querySelector<HTMLDivElement>('#chat')!
  const scroll = fakeScroll(chat, { scrollHeight: 1000, clientHeight: 200 })
  /** The content changed size: the browser's ResizeObserver would report it. */
  const grow = (scrollHeight: number) =>
    act(async () => {
      scroll.size.scrollHeight = scrollHeight
      ro.fire(chat.firstElementChild!, {})
    })
  return { ro, chat, scroll, grow, unmount: () => act(async () => root.unmount()) }
}

describe('useStickToBottom', () => {
  componentMatrix(Chat)

  it('starts at the bottom and follows content that grows with no scroll event', async () => {
    const view = await setup()
    await view.grow(1000)
    expect(view.chat.scrollTop).toBe(800)
    expect(last.atBottom).toBe(true)

    await view.grow(1500) // e.g. a streamed reply
    expect(view.chat.scrollTop).toBe(1300)
    await view.unmount()
    expect(view.ro.observedCount()).toBe(0)
  })

  it('stops following when the user scrolls up, and follows again at the bottom', async () => {
    const view = await setup()
    await view.grow(1000)
    await act(async () => view.scroll.scrollTo(500))
    expect(last.atBottom).toBe(false)

    await view.grow(1500)
    expect(view.chat.scrollTop).toBe(500) // not pulled down while reading

    await act(async () => view.scroll.scrollTo(1300))
    expect(last.atBottom).toBe(true)
    await view.grow(2000)
    expect(view.chat.scrollTop).toBe(1800)
    await view.unmount()
  })

  it("doesn't pull the user down when content grows before their scroll event fires", async () => {
    const view = await setup()
    await view.grow(1000)
    view.chat.scrollTop = 600 // the user's scroll moved, its event is still queued
    await view.grow(1200)
    expect(view.chat.scrollTop).toBe(600)
    expect(last.atBottom).toBe(false)
    await view.unmount()
  })

  it('keeps following when content shrinks', async () => {
    const view = await setup()
    await view.grow(1000)
    await view.grow(700) // the browser clamps scrollTop to the new bottom
    expect(last.atBottom).toBe(true)
    await view.grow(900)
    expect(view.chat.scrollTop).toBe(700)
    await view.unmount()
  })

  it('scrollToBottom scrolls down and follows again', async () => {
    const view = await setup()
    await view.grow(1000)
    await act(async () => view.scroll.scrollTo(100))
    expect(last.atBottom).toBe(false)

    await act(async () => last.scrollToBottom('instant'))
    expect(view.chat.scrollTop).toBe(800)
    expect(last.atBottom).toBe(true)
    await view.grow(1200)
    expect(view.chat.scrollTop).toBe(1000)
    await view.unmount()
  })

  it('stops following on the intent to scroll up, before scrollTop moves', async () => {
    const view = await setup()
    await view.grow(1000)
    // Smooth scrolling hasn't moved scrollTop yet when content grows: following now would
    // cancel the user's scroll.
    await act(async () => view.chat.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 })))
    expect(last.atBottom).toBe(false)
    await view.grow(1500)
    expect(view.chat.scrollTop).toBe(800)

    await act(async () => last.scrollToBottom('instant'))
    await act(async () => view.chat.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 })))
    expect(last.atBottom).toBe(true) // scrolling down doesn't stop it

    await act(async () =>
      view.chat.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true })),
    )
    expect(last.atBottom).toBe(false)
    await view.unmount()
  })

  it("doesn't follow again on a stale scroll event at the bottom after the user scrolls up", async () => {
    const view = await setup()
    await view.grow(1000)
    await act(async () => view.chat.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 })))
    // The event from our own earlier scroll arrives late; scrollTop hasn't moved yet.
    await act(async () => view.chat.dispatchEvent(new Event('scroll')))
    expect(last.atBottom).toBe(false)
    await view.unmount()
  })

  it('ignores a wheel when there is nothing to scroll', async () => {
    const view = await setup()
    await view.grow(150) // shorter than the box
    await act(async () => view.chat.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 })))
    expect(last.atBottom).toBe(true)
    await view.grow(1000)
    expect(view.chat.scrollTop).toBe(800)
    await view.unmount()
  })
})
