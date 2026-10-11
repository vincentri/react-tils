import { useEffect, useState } from 'react'
// correct but flashes: effect-based, with cleanup
export default function Solution() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    setDark(mql.matches)
    const on = (e: MediaQueryListEvent) => setDark(e.matches)
    mql.addEventListener('change', on)
    return () => mql.removeEventListener('change', on)
  }, [])
  return <p>{dark ? 'Dark' : 'Light'}</p>
}
