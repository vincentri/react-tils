import { useHash } from '@vincent.ri/react-tils'
export default function Solution() {
  const [hash] = useHash()
  return <p>{hash === '#billing' ? 'Billing' : 'Profile'}</p>
}
