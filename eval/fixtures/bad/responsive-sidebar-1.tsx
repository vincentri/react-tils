import { useState } from 'react'
// hydration bug: reads window in initializer
export default function Solution() {
  const [wide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768)
  return wide ? <aside>Sidebar</aside> : <button>Menu</button>
}
