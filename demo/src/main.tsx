import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { App } from './App'

// The HTML was rendered on the server at build time (see prerender.ts); hydrate it.
hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <App />
  </StrictMode>,
  {
    onRecoverableError: (error) => console.error('Recoverable hydration error:', error),
  },
)
