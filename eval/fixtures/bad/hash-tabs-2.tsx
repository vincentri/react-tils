// useState + useEffect: shows Profile for a frame before Billing
import { useEffect, useState } from 'react'
export default function Solution() {
  const [hash, setHash] = useState('')
  useEffect(() => {
    const update = () => setHash(location.hash)
    update()
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  return <p>{hash === '#billing' ? 'Billing' : 'Profile'}</p>
}
