import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { App, IDS } from './App'
import { hookDoc, summary } from './docs'

/** `path` is relative to the site root: `''` for home, `hooks/useHash/` for a hook's page. */
export function render(path: string): string {
  return renderToString(
    <StrictMode>
      <App path={path} />
    </StrictMode>,
  )
}

/** The tutorial and every hook's page, for prerendering: its path, title, and meta description. */
export const pages = [
  {
    path: 'getting-started/',
    title: 'Installation — react-tils',
    description:
      'Install react-tils, use your first hook, and set up server rendering, Next.js, AI agents, and tests.',
  },
  ...IDS.map((hook) => ({
    path: `hooks/${hook}/`,
    title: `${hook} — react-tils`,
    description: summary(hookDoc(hook)),
  })),
]
