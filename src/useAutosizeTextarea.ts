import { useRef, useState } from 'react'
import { useIsomorphicLayoutEffect } from './internal/useIsomorphicLayoutEffect'

export type AutosizeTextareaOptions = {
  /** Stop growing after this many lines and scroll instead. Default: no limit. */
  maxRows?: number | undefined
}

const px = (value: string) => Number.parseFloat(value) || 0

function resize(element: HTMLTextAreaElement, maxRows: number | undefined) {
  const style = getComputedStyle(element)
  const padding = px(style.paddingTop) + px(style.paddingBottom)
  const border = px(style.borderTopWidth) + px(style.borderBottomWidth)
  const lineHeight = px(style.lineHeight) || px(style.fontSize) * 1.2

  // Measure the content at its natural height. `rows` still sets the minimum.
  element.style.setProperty('height', 'auto')
  const content = element.scrollHeight - padding
  const limit = maxRows === undefined ? Infinity : maxRows * lineHeight
  const height = Math.min(content, limit)
  const total = style.boxSizing === 'border-box' ? height + padding + border : height
  element.style.setProperty('height', `${total}px`)
  element.style.setProperty('overflow-y', content > limit ? 'auto' : 'hidden')
}

/**
 * Grows a `<textarea>` to fit its text, up to `maxRows` lines, then scrolls.
 * Returns a callback ref for the textarea. Set the minimum with the textarea's
 * own `rows` attribute.
 *
 * Resizes on typing and paste, when a controlled `value` changes from code
 * (e.g. cleared after sending), and when the textarea's width changes and the
 * text rewraps. Handles padding, borders, and `box-sizing`. Works the same in
 * every browser; CSS `field-sizing: content` does this natively but is not
 * supported everywhere yet.
 *
 * Use when: chat inputs, comment boxes, or any text box that should grow
 * with its content.
 * Don't use when: the textarea has a fixed height, or every browser you
 * support has `field-sizing: content`.
 *
 * Other libraries call this `useTextareaAutosize`, `useAutoResize`, `react-textarea-autosize`.
 *
 * @param options - `maxRows`. Optional.
 * @returns A callback ref. Pass it to the textarea's `ref` prop.
 *
 * @example
 * const [message, setMessage] = useState('')
 * const ref = useAutosizeTextarea({ maxRows: 8 })
 * return (
 *   <textarea ref={ref} rows={1} value={message} onChange={(e) => setMessage(e.target.value)} />
 * )
 */
export function useAutosizeTextarea(
  options: AutosizeTextareaOptions = {},
): (element: HTMLTextAreaElement | null) => void {
  const { maxRows } = options
  const [element, setElement] = useState<HTMLTextAreaElement | null>(null)
  // The value last measured, to catch controlled values changed from code (no input event).
  const measured = useRef<string | null>(null)

  useIsomorphicLayoutEffect(() => {
    if (!element) return
    let width = element.getBoundingClientRect().width
    const update = () => {
      measured.current = element.value
      resize(element, maxRows)
    }
    const observer = new ResizeObserver(([entry]) => {
      // Our own height changes also reach here; only a new width rewraps the text.
      if (!entry || entry.contentRect.width === width) return
      width = entry.contentRect.width
      update()
    })
    update()
    element.addEventListener('input', update)
    observer.observe(element)
    return () => {
      element.removeEventListener('input', update)
      observer.disconnect()
    }
  }, [element, maxRows])

  // After every render: a controlled value may have changed without an input event.
  useIsomorphicLayoutEffect(() => {
    if (element && element.value !== measured.current) {
      measured.current = element.value
      resize(element, maxRows)
    }
  })

  return setElement
}
