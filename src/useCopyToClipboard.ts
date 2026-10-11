import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Copies text to the clipboard and reports `copied` for a short time, for a
 * "Copied!" label.
 *
 * `copy` resolves to `true` on success and `false` when the browser refuses
 * (no permission, insecure context, or no Clipboard API). Copying again
 * restarts the timer. The timer is cleared on unmount.
 *
 * Use when: a "Copy" button for a code snippet, link, or API key.
 * Don't use when: you need to copy rich content (HTML, images); call
 * `navigator.clipboard.write()` with a `ClipboardItem`. Call `copy` from a
 * user action (click, keypress); browsers block clipboard writes otherwise.
 *
 * @param resetMs - How long `copied` stays `true`. Default `2000`.
 * @returns `[copy, copied]`.
 *
 * @example
 * const [copy, copied] = useCopyToClipboard()
 * return <button onClick={() => copy(apiKey)}>{copied ? 'Copied!' : 'Copy'}</button>
 */
export function useCopyToClipboard(resetMs = 2000): [(text: string) => Promise<boolean>, boolean] {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = useCallback(
    async (text: string) => {
      clearTimeout(timer.current)
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        setCopied(false)
        return false
      }
      setCopied(true)
      timer.current = setTimeout(() => setCopied(false), resetMs)
      return true
    },
    [resetMs],
  )

  return [copy, copied]
}
