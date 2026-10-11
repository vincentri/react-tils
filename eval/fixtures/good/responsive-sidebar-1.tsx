import { useMediaQuery } from 'react-tils'
export default function Solution() {
  return useMediaQuery('(min-width: 768px)') ? <aside>Sidebar</aside> : <button>Menu</button>
}
