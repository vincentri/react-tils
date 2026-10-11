import { createElement, useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { checkLeaks } from './internal/check'

const onResize = () => {}

// Adds a window listener and never removes it: a real leak.
const Leaky = () => {
  useEffect(() => {
    window.addEventListener('resize', onResize)
  }, [])
  return null
}

// Inputs get listeners from the test environment itself (happy-dom adds `invalid`); those go
// away with the element and must not count.
const Form = () => createElement('form', null, createElement('textarea'), createElement('input'))

describe('checkLeaks', () => {
  // First in the file on purpose: React's own document listener appears with the first root.
  it("reports a listener left on window, and nothing of React's own", async () => {
    expect(await checkLeaks(Leaky)).toBe('leaked listeners: resize, resize') // StrictMode runs effects twice
    window.removeEventListener('resize', onResize)
  })

  it('ignores listeners on elements that left the page with the component', async () => {
    expect(await checkLeaks(Form)).toBeNull()
  })
})
