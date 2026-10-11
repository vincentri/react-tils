import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { App } from './App'

// The HTML was rendered on the server at build time (see prerender.ts); hydrate it.
// The same path the page was prerendered for, relative to the site root.
const path = location.pathname.slice(import.meta.env.BASE_URL.length)

hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <App path={path} />
  </StrictMode>,
  {
    onRecoverableError: (error) => console.error('Recoverable hydration error:', error),
  },
)
