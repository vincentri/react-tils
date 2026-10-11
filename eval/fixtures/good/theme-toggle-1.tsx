import { useLocalStorage } from 'react-tils'
export default function Solution() {
  const [theme, setTheme] = useLocalStorage('theme', 'light')
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>Theme: {theme}</button>
  )
}
