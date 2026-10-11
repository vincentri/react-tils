// Eval tasks: each asks an agent for a `Solution` component, then the scorer
// hydrates it under every client state and checks the text after effects.

import { act, createElement, type FunctionComponent } from 'react'
import { createRoot } from 'react-dom/client'
import { vi } from 'vitest'

export type State = {
  name: string
  setup?: (Solution: FunctionComponent) => void | Promise<void>
  expect: string
}
export type Task = { id: string; states: State[] }

type HappyDOM = {
  setViewport(v: { width: number; height: number }): void
  settings: { device: { prefersColorScheme: string; prefersReducedMotion: string } }
}
const happyDOM = () => (window as unknown as { happyDOM: HappyDOM }).happyDOM

const viewport = (width: number) => () => happyDOM().setViewport({ width, height: 768 })
const device = (key: 'prefersColorScheme' | 'prefersReducedMotion', value: string) => () => {
  happyDOM().settings.device[key] = value
}

/** Simulate a previous visit: mount, click the first button, unmount. */
const clickOnce = async (Solution: FunctionComponent) => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(createElement(Solution)))
  await act(async () => container.querySelector('button')?.click())
  await act(async () => root.unmount())
  container.remove()
}

export function resetEnvironment(): void {
  localStorage.clear()
  history.replaceState(null, '', '/')
  happyDOM().setViewport({ width: 1024, height: 768 })
  device('prefersColorScheme', 'light')()
  device('prefersReducedMotion', 'no-preference')()
  vi.restoreAllMocks()
}

export const tasks: Task[] = [
  {
    id: 'responsive-sidebar',
    states: [
      { name: 'desktop', setup: viewport(1024), expect: 'Sidebar' },
      { name: 'mobile', setup: viewport(500), expect: 'Menu' },
    ],
  },
  {
    id: 'window-width',
    states: [
      { name: '1024px', setup: viewport(1024), expect: 'Width: 1024' },
      { name: '500px', setup: viewport(500), expect: 'Width: 500' },
    ],
  },
  {
    id: 'theme-toggle',
    states: [
      { name: 'first visit', expect: 'Theme: light' },
      { name: 'reload after toggling', setup: clickOnce, expect: 'Theme: dark' },
    ],
  },
  {
    id: 'offline-banner',
    states: [
      { name: 'online', expect: 'Online' },
      {
        name: 'offline',
        setup: () => void vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false),
        expect: 'You are offline',
      },
    ],
  },
  {
    id: 'pause-when-hidden',
    states: [
      { name: 'visible', expect: 'Polling' },
      {
        name: 'hidden',
        setup: () => {
          vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
          vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
        },
        expect: 'Paused',
      },
    ],
  },
  {
    id: 'system-dark-mode',
    states: [
      { name: 'light OS', expect: 'Light' },
      { name: 'dark OS', setup: device('prefersColorScheme', 'dark'), expect: 'Dark' },
    ],
  },
  {
    id: 'reduced-motion',
    states: [
      { name: 'no preference', expect: 'Animations on' },
      { name: 'reduce', setup: device('prefersReducedMotion', 'reduce'), expect: 'Animations off' },
    ],
  },
  {
    id: 'hash-tabs',
    states: [
      { name: 'no hash', expect: 'Profile' },
      {
        name: '#billing',
        setup: () => history.replaceState(null, '', '#billing'),
        expect: 'Billing',
      },
    ],
  },
  {
    id: 'language-greeting',
    states: [
      { name: 'English browser', expect: 'Hello' },
      {
        name: 'Spanish browser',
        setup: () => {
          vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-ES')
          vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['es-ES', 'es'])
        },
        expect: 'Hola',
      },
    ],
  },
]
