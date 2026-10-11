import { useDocumentVisibility } from 'react-tils'
export default function Solution() {
  return <p>{useDocumentVisibility() === 'visible' ? 'Polling' : 'Paused'}</p>
}
