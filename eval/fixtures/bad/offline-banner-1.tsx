import { useEffect, useState } from 'react'
// leak: no cleanup
export default function Solution() {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    setOnline(navigator.onLine)
    window.addEventListener('offline', () => setOnline(false))
  }, [])
  return <p>{online ? 'Online' : 'You are offline'}</p>
}
