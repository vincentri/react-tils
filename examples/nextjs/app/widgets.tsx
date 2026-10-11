'use client'

import Link from 'next/link'
import { useHash, useHydrated, useLocalStorage, useOnline } from 'react-tils'
// Subpath import: checks that per-hook entry points resolve, types included.
import { useMediaQuery } from 'react-tils/useMediaQuery'

export function Widgets() {
  const wide = useMediaQuery('(min-width: 768px)')
  const online = useOnline()
  const hydrated = useHydrated()
  const [count, setCount] = useLocalStorage('next-count', 0)
  const [hash] = useHash()
  return (
    <ul>
      <li>
        viewport: <output data-testid="wide">{wide ? 'wide' : 'narrow'}</output>
      </li>
      <li>
        network: <output data-testid="online">{online ? 'online' : 'offline'}</output>
      </li>
      <li>
        hydrated: <output data-testid="hydrated">{String(hydrated)}</output>
      </li>
      <li>
        stored count: <output data-testid="count">{count}</output>{' '}
        <button type="button" data-testid="inc" onClick={() => setCount((c) => c + 1)}>
          +1
        </button>
      </li>
      <li>
        {/* Next changes the hash with history.pushState, which fires no hashchange. */}
        <Link href="#billing" data-testid="hash-link">
          #billing
        </Link>{' '}
        hash: <output data-testid="hash">{hash || '(none)'}</output>
      </li>
    </ul>
  )
}
