import { useCallback, useMemo, useSyncExternalStore } from 'react'

const subscribeNothing = () => () => {}

/**
 * Opens the device's native share sheet (Web Share API), and says whether it
 * is available.
 *
 * `supported` is `false` on the server and during hydration, so a share button
 * appears after hydration with no mismatch. `share` resolves `true` when
 * shared, and `false` when unsupported, when the data can't be shared (e.g.
 * files on a browser that doesn't support them), or when the user cancels.
 *
 * Use when: a "Share" button on mobile, especially for links or files.
 * Don't use when: you need a fallback everywhere; desktop Firefox and many
 * desktop setups don't support it, so pair it with `useCopyToClipboard`. Call
 * `share` from a user action (click); browsers refuse otherwise.
 *
 * @returns `{ supported, share }`.
 *
 * @example
 * const { supported, share } = useShare()
 * const [copy, copied] = useCopyToClipboard()
 * return supported ? (
 *   <button onClick={() => share({ title: post.title, url: post.url })}>Share</button>
 * ) : (
 *   <button onClick={() => copy(post.url)}>{copied ? 'Copied!' : 'Copy link'}</button>
 * )
 */
export function useShare(): { supported: boolean; share: (data: ShareData) => Promise<boolean> } {
  const supported = useSyncExternalStore(
    subscribeNothing,
    () => typeof navigator.share === 'function',
    () => false,
  )

  const share = useCallback(async (data: ShareData) => {
    if (typeof navigator.share !== 'function') return false
    if (typeof navigator.canShare === 'function' && !navigator.canShare(data)) return false
    try {
      await navigator.share(data)
      return true
    } catch {
      return false // AbortError when the user cancels, NotAllowedError without a user action
    }
  }, [])

  return useMemo(() => ({ supported, share }), [supported, share])
}
