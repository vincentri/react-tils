import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { App, IDS, pageHook } from './App'
import { hookDoc, summary } from './docs'
import { hookMarkdown } from './markdown'

/** `path` is relative to the site root: `''` for home, `hooks/useHash/` for a hook's page. */
export function render(path: string): string {
  return renderToString(
    <StrictMode>
      <App path={path} />
    </StrictMode>,
  )
}

/** The tutorial, the comparisons, and every hook's page, for prerendering. */
export const pages = [
  {
    path: 'getting-started/',
    title: 'Installation — react-tils',
    description:
      'Install react-tils, use your first hook, and set up server rendering, Next.js, AI agents, and tests.',
  },
  {
    path: 'compare/',
    title: 'Compare — react-tils',
    description:
      'The same everyday tasks in seven React hook libraries, rendered on a real server, hydrated in a browser, checked for leaked listeners, and measured.',
  },
  ...IDS.map((hook) => ({
    path: `hooks/${hook}/`,
    title: `${hook} — react-tils`,
    description: summary(hookDoc(hook)),
  })),
]

/** A hook's docs as markdown, for the `.md` URL next to its page; other pages have none. */
export function markdown(path: string): string | null {
  const hook = pageHook(path)
  return hook ? hookMarkdown(hook) : null
}
