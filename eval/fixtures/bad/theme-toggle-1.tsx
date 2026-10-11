import { useState } from 'react'
// wrong: never persists
export default function Solution() {
  const [theme, setTheme] = useState('light')
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>Theme: {theme}</button>
  )
}
