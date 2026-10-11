import { useMediaQuery } from '@vincent.ri/react-tils'
export default function Solution() {
  return (
    <p>{useMediaQuery('(prefers-reduced-motion: reduce)') ? 'Animations off' : 'Animations on'}</p>
  )
}
