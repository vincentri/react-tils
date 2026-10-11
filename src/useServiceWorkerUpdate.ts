import { useCallback, useEffect, useMemo, useState } from 'react'

export type ServiceWorkerUpdateOptions = {
  /** Also ask the server for a new service worker this often, in milliseconds. Default: only when the browser checks by itself (on navigation). */
  checkIntervalMs?: number
}

/**
 * Whether a new version of your service worker (a PWA's offline code) is
 * installed and waiting, and `update()` to switch to it and reload once.
 *
 * Notices a worker that was already waiting when the page loaded, and one
 * that finishes installing while the page is open. `update()` tells the
 * waiting worker to take over, then reloads the page exactly once when it
 * has, never in a loop. Nothing happens on the server or without a service
 * worker.
 *
 * Your service worker must call `self.skipWaiting()` when it receives the
 * message `{ type: 'SKIP_WAITING' }`. Workbox and vite-plugin-pwa do this
 * with their "prompt for update" setting.
 *
 * Use when: showing a "New version available. Reload" banner in a PWA or
 * any site with a service worker.
 * Don't use when: you don't use a service worker; a deploy then reaches
 * users on their next page load anyway. To check whether the user is
 * online, use `useOnline`.
 *
 * Other libraries call this `useRegisterSW` (vite-plugin-pwa), `useServiceWorker`.
 *
 * @param options - `checkIntervalMs`. Optional.
 * @returns `{ updateAvailable, update }`.
 *
 * @example
 * const { updateAvailable, update } = useServiceWorkerUpdate({ checkIntervalMs: 60 * 60_000 })
 * if (!updateAvailable) return null
 * return (
 *   <div role="status">
 *     A new version is available. <button onClick={update}>Reload</button>
 *   </div>
 * )
 */
export function useServiceWorkerUpdate(options: ServiceWorkerUpdateOptions = {}): {
  updateAvailable: boolean
  update: () => void
} {
  const { checkIntervalMs } = options
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const container = navigator.serviceWorker
    let registration: ServiceWorkerRegistration | undefined
    let cancelled = false
    // A waiting worker only matters if a worker controls the page: on the very first install
    // there is nothing to update from.
    const ready = (worker: ServiceWorker | null) => {
      if (!cancelled && worker && container.controller) setUpdateAvailable(true)
    }
    const onUpdateFound = () => {
      const installing = registration?.installing
      if (!installing) return
      const onStateChange = () => {
        if (installing.state === 'installed') ready(installing)
        if (installing.state === 'installed' || installing.state === 'redundant')
          installing.removeEventListener('statechange', onStateChange)
      }
      installing.addEventListener('statechange', onStateChange)
    }

    void container.getRegistration().then((found) => {
      if (cancelled || !found) return
      registration = found
      ready(found.waiting)
      found.addEventListener('updatefound', onUpdateFound)
    })
    const timer =
      checkIntervalMs === undefined
        ? undefined
        : setInterval(() => void registration?.update().catch(() => {}), checkIntervalMs)

    return () => {
      cancelled = true
      registration?.removeEventListener('updatefound', onUpdateFound)
      clearInterval(timer)
    }
  }, [checkIntervalMs])

  const update = useCallback(() => {
    if (!('serviceWorker' in navigator)) return
    const container = navigator.serviceWorker
    void container.getRegistration().then((registration) => {
      const waiting = registration?.waiting
      if (!waiting) return
      container.addEventListener('controllerchange', () => location.reload(), { once: true })
      // ServiceWorker.postMessage has no target origin, unlike window.postMessage.
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
      waiting.postMessage({ type: 'SKIP_WAITING' })
    })
  }, [])

  return useMemo(() => ({ updateAvailable, update }), [updateAvailable, update])
}
