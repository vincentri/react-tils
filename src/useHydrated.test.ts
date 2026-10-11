import { act, createElement, Fragment, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { serverRender } from './internal/check'
import { hookMatrix } from './testing'
import { useHydrated } from './useHydrated'

const Hydrated = () => String(useHydrated())

describe('useHydrated', () => {
  hookMatrix(() => useHydrated())

  it('is false on the server', () => {
    expect(serverRender(Hydrated)).toBe('false')
  })

  it('is true on the first frame of a client-side mount (no flash)', async () => {
    let firstFrame = ''
    const container = document.createElement('div')
    const Probe = () => {
      useLayoutEffect(() => {
        firstFrame ||= container.textContent ?? ''
      })
      return null
    }
    const root = createRoot(container)
    await act(async () =>
      root.render(createElement(Fragment, null, createElement(Hydrated), createElement(Probe))),
    )
    expect(firstFrame).toBe('true')
    await act(async () => root.unmount())
  })
})
