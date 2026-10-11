// The docs site's own UI: code blocks, the theme switch, and search. Built with the library's
// hooks, so the site is also a working example of them.
import {
  createElement,
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  useClickOutside,
  useCopyToClipboard,
  useHotkey,
  useLocalStorage,
} from '@vincent.ri/react-tils'

// Comments, strings, keywords, and numbers: enough color to scan TypeScript, with no dependency.
const TOKENS =
  /(\/\/.*$|\/\*[\s\S]*?\*\/)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(import|from|export|const|let|function|return|if|else|new|type|await|async|declare|extends|typeof|true|false|null|undefined|void)\b|\b(\d+(?:\.\d+)?)\b/gm
const KINDS = ['comment', 'string', 'keyword', 'number'] as const

function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const match of code.matchAll(TOKENS)) {
    const kind = KINDS[match.slice(1).findIndex(Boolean)]!
    out.push(
      code.slice(last, match.index),
      <span key={match.index} className={`tok-${kind}`}>
        {match[0]}
      </span>,
    )
    last = match.index + match[0].length
  }
  out.push(code.slice(last))
  return out
}

export function Code({
  children,
  testId,
  className = '',
}: {
  children: string
  testId?: string
  className?: string
}) {
  const [copy, copied] = useCopyToClipboard(1500)
  return (
    <div className="code-block">
      <pre className={`code ${className}`} data-testid={testId}>
        <code>{highlight(children)}</code>
      </pre>
      <button type="button" className="copy" onClick={() => copy(children)}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

type Theme = 'system' | 'light' | 'dark'
const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
const ICONS: Record<Theme, ReactNode> = {
  system: <path d="M12 3a9 9 0 1 0 0 18V3Z M12 3a9 9 0 0 1 0 18" />,
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  dark: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
}

/** System, light, or dark; remembered. index.html applies it before the first paint. */
export function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage<Theme>('react-tils-theme', 'system')
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
  }, [theme])
  return (
    <button
      type="button"
      className="icon-button"
      data-testid="theme-toggle"
      aria-label={`Theme: ${theme}. Switch to ${NEXT[theme]}`}
      title={`Theme: ${theme}`}
      onClick={() => setTheme(NEXT[theme])}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {ICONS[theme]}
      </svg>
    </button>
  )
}

export type SearchEntry = {
  title: string
  href: string
  /** Shown under the title. */
  summary: string
  /** Searched too, but not shown: aliases, when to use it, the category. */
  keywords: string
}

/** Every word must match somewhere; matches in the title count most. */
export function searchEntries(entries: SearchEntry[], query: string): SearchEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const scored: { entry: SearchEntry; score: number }[] = []
  for (const entry of entries) {
    const title = entry.title.toLowerCase()
    const rest = `${entry.summary} ${entry.keywords}`.toLowerCase()
    let score = 0
    for (const word of words) {
      if (title === word || title === `use${word}`) score += 100
      else if (title.startsWith(word) || title.startsWith(`use${word}`)) score += 30
      else if (title.includes(word)) score += 10
      else if (rest.includes(word)) score += 1
      else {
        score = 0
        break
      }
    }
    if (score > 0) scored.push({ entry, score })
  }
  return scored
    .toSorted((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .map((s) => s.entry)
}

export function Search({ entries }: { entries: SearchEntry[] }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const results = useMemo(() => searchEntries(entries, query).slice(0, 8), [entries, query])
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false), open)
  const focus = () => input.current?.focus()
  // `/` like GitHub and MDN. Not mod+k: the useHotkey demo shows that one off.
  useHotkey('/', focus)
  const shown = open && query.trim() !== ''

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + results.length) % Math.max(results.length, 1))
    } else if (event.key === 'Enter' && results[active]) {
      location.href = results[active].href
    } else if (event.key === 'Escape') {
      setQuery('')
      input.current?.blur()
    }
  }

  return (
    <div ref={ref} className="search">
      <svg
        className="search-icon"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-label="Search the docs"
        aria-expanded={shown}
        aria-controls="search-results"
        aria-autocomplete="list"
        aria-activedescendant={shown && results[active] ? `search-result-${active}` : undefined}
        placeholder="Search hooks…"
        data-testid="site-search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <kbd className="search-key" aria-hidden="true">
        /
      </kbd>
      {shown && (
        <ul
          id="search-results"
          role="listbox"
          className="search-results"
          data-testid="search-results"
        >
          {results.length === 0 && <li className="search-empty">No results for “{query}”</li>}
          {results.map((entry, i) => (
            <li
              key={entry.href}
              id={`search-result-${i}`}
              role="option"
              aria-selected={i === active}
            >
              <a href={entry.href} onMouseEnter={() => setActive(i)}>
                <span className="search-title">{entry.title}</span>
                <span className="search-summary">{entry.summary}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Text with `code` spans. */
export function Prose({ text }: { text: string }) {
  return createElement(
    Fragment,
    null,
    ...text.split('`').map((part, i) => (i % 2 === 1 ? createElement('code', null, part) : part)),
  )
}
