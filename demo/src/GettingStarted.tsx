import { type ReactNode, useState } from 'react'
import { Code, type SearchEntry } from './chrome'
import { PACKAGE } from './docs'

const MANAGERS = {
  npm: `npm install ${PACKAGE}`,
  pnpm: `pnpm add ${PACKAGE}`,
  yarn: `yarn add ${PACKAGE}`,
  bun: `bun add ${PACKAGE}`,
}
type Manager = keyof typeof MANAGERS

/** The page's sections, for the search index and the page's own table of contents. */
export const SECTIONS = [
  { id: 'install', title: 'Install', keywords: 'npm pnpm yarn bun add package setup' },
  { id: 'first-hook', title: 'Your first hook', keywords: 'quick start example usage' },
  {
    id: 'server-rendering',
    title: 'Server rendering',
    keywords: 'ssr hydration mismatch serverValue first frame',
  },
  { id: 'nextjs', title: 'Next.js', keywords: 'app router use client server component request' },
  { id: 'imports', title: 'Importing', keywords: 'tree shaking subpath bundle size esm' },
  { id: 'ai-agents', title: 'Set up your AI agent', keywords: 'claude cursor agents.md init npx' },
  { id: 'testing', title: 'Testing', keywords: 'vitest hookMatrix componentMatrix leaks jest' },
  {
    id: 'compatibility',
    title: 'Compatibility',
    keywords: 'react 18 19 compiler typescript esm jest',
  },
] as const

export const gettingStartedEntries = (base: string): SearchEntry[] =>
  SECTIONS.map((section) => ({
    title: section.title,
    href: `${base}getting-started/#${section.id}`,
    summary: 'Getting started',
    keywords: section.keywords,
  }))

function Step({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="step">
      <h2>
        <a href={`#${id}`}>{title}</a>
      </h2>
      {children}
    </section>
  )
}

export function GettingStarted({ base }: { base: string }) {
  const [manager, setManager] = useState<Manager>('npm')
  return (
    <article className="doc" data-testid="getting-started">
      <p className="crumb">Getting started</p>
      <h1>Installation</h1>
      <p className="lead">
        Add the package, use a hook, and your component reads browser state correctly on the server,
        during hydration, and from its first frame in the browser.
      </p>
      <nav className="toc" aria-label="On this page">
        {SECTIONS.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.title}
          </a>
        ))}
      </nav>

      <Step id="install" title="Install">
        <div className="tabs" role="tablist" aria-label="Package manager">
          {(Object.keys(MANAGERS) as Manager[]).map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={manager === name}
              data-testid={`pm-${name}`}
              onClick={() => setManager(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <Code testId="install-command">{MANAGERS[manager]}</Code>
        <p>No dependencies besides React. Works with React 18 and 19.</p>
      </Step>

      <Step id="first-hook" title="Your first hook">
        <p>
          Import a hook and call it like any other. This sidebar collapses on small screens,
          remembers the user's choice, and warns when the network drops:
        </p>
        <Code>{`'use client'
import { useLocalStorage, useMediaQuery, useOnline } from '${PACKAGE}'

export function Sidebar() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [collapsed, setCollapsed] = useLocalStorage('sidebar-collapsed', false)
  const online = useOnline()

  return (
    <aside data-collapsed={collapsed || !isDesktop}>
      {!online && <p>You're offline. Changes will sync later.</p>}
      <button onClick={() => setCollapsed((c) => !c)}>Toggle</button>
    </aside>
  )
}`}</Code>
        <p>
          Not sure which hook you need? <a href={base}>Browse all hooks</a>, or press <kbd>/</kbd>{' '}
          to search.
        </p>
      </Step>

      <Step id="server-rendering" title="Server rendering">
        <p>
          The server can't see the browser, so hooks that read browser state take an optional{' '}
          <code>serverValue</code>: what to render on the server and during hydration. Right after
          hydration the hook switches to the real value, with no hydration mismatch. On a
          client-side mount, such as after navigation, the real value renders immediately.
        </p>
        <Code>{`const isDesktop = useMediaQuery('(min-width: 1024px)', true) // assume desktop on the server
const now = useNow(1000) // null on the server, then the time every second`}</Code>
        <p>
          Pick the <code>serverValue</code> most visitors will have, so the switch after hydration
          is rare. For anything that must never show a default, render it only after hydration with{' '}
          <code>useHydrated()</code>.
        </p>
      </Step>

      <Step id="nextjs" title="Next.js">
        <p>
          Hooks run in client components, so add <code>'use client'</code> to the file that calls
          them. When the server does know the value, because it arrives with the request, read it in
          a server component and pass it down as <code>serverValue</code>. The first frame is then
          already right:
        </p>
        <Code>{`// app/settings/page.tsx (server component)
import { cookies } from 'next/headers'
import { Settings } from './settings'

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const theme = (await cookies()).get('theme')?.value ?? null
  const { tab = null } = await searchParams
  return <Settings serverTheme={theme} serverTab={tab} />
}

// app/settings/settings.tsx
'use client'
import { useCookie, useSearchParam } from '${PACKAGE}'

export function Settings({ serverTheme, serverTab }: { serverTheme: string | null; serverTab: string | null }) {
  const [theme, setTheme] = useCookie('theme', serverTheme)
  const [tab, setTab] = useSearchParam('tab', serverTab)
  // …
}`}</Code>
      </Step>

      <Step id="imports" title="Importing">
        <p>
          Import from the package root or from a hook's own path. Both tree-shake, so you only ship
          the hooks you use, each a few hundred bytes.
        </p>
        <Code>{`import { useMediaQuery } from '${PACKAGE}'
import { useMediaQuery } from '${PACKAGE}/useMediaQuery'`}</Code>
        <p>
          Every hook's docs and examples are in its type declarations, so your editor shows them on
          hover.
        </p>
      </Step>

      <Step id="ai-agents" title="Set up your AI agent">
        <p>
          Coding agents rarely use an installed library unless something points them to it. One
          command adds that pointer:
        </p>
        <Code>npx react-tils init</Code>
        <p>
          It adds one line to your <code>CLAUDE.md</code> and <code>AGENTS.md</code> (creating them
          if needed), plus a Cursor rule if you use Cursor, pointing the agent at the library's
          guide. Running it again changes nothing. In our evaluation, this one line took agent
          solutions with a wrong first frame from 17 of 27 (Claude Haiku) and 14 of 27 (Claude
          Sonnet) to 0 of 27 for both.
        </p>
      </Step>

      <Step id="testing" title="Testing">
        <p>
          The checks every hook here passes are exported, so you can run them on your own hooks and
          components with Vitest, in a <code>happy-dom</code> or <code>jsdom</code> environment:
        </p>
        <Code>{`import { describe } from 'vitest'
import { componentMatrix, hookMatrix } from '${PACKAGE}/testing'
import { Sidebar } from './Sidebar'
import { useScrollY } from './useScrollY'

describe('useScrollY', () => {
  hookMatrix(() => useScrollY())
})

describe('Sidebar', () => {
  componentMatrix(Sidebar)
})`}</Code>
        <p>
          They fail if the code touches the DOM during server render, causes a hydration mismatch,
          or leaks a listener after a StrictMode mount and unmount.
        </p>
      </Step>

      <Step id="compatibility" title="Compatibility">
        <ul>
          <li>React 18 and 19, including React Compiler: nothing to configure.</li>
          <li>Next.js (App Router), Vite, and any bundler with ESM support.</li>
          <li>
            TypeScript with <code>moduleResolution</code> set to <code>bundler</code> or{' '}
            <code>nodenext</code>.
          </li>
          <li>
            ESM only. Vitest works out of the box; Jest needs its ESM mode, or{' '}
            <code>transformIgnorePatterns</code> set so it transforms <code>{PACKAGE}</code>.
          </li>
        </ul>
        <p className="next">
          <a href={base}>Browse all hooks →</a>
        </p>
      </Step>
    </article>
  )
}
