'use client'

import { useEffect, useState } from 'react'
import { useWindowSize } from '@vincent.ri/react-tils'

// The pattern agents usually write: state starts at 0 and is fixed in an effect,
// so the first frame after a client-side navigation shows 0.
function useWindowWidthWithEffect() {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const update = () => setWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return width
}

export default function Measure() {
  const { width } = useWindowSize()
  const effectWidth = useWindowWidthWithEffect()
  return (
    <main>
      <h1>Measure</h1>
      <p>
        react-tils: <span data-testid="width-lib">{width}</span>
      </p>
      <p>
        useEffect version: <span data-testid="width-effect">{effectWidth}</span>
      </p>
    </main>
  )
}
