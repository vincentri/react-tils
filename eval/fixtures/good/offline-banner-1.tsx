import { useOnline } from 'react-tils'
export default function Solution() {
  return <p>{useOnline() ? 'Online' : 'You are offline'}</p>
}
