import { useMediaQuery } from '@vincent.ri/react-tils/useMediaQuery'
export default function Solution() {
  return <p>{useMediaQuery('(prefers-color-scheme: dark)') ? 'Dark' : 'Light'}</p>
}
