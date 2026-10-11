import { usePreferredLanguages } from '@vincent.ri/react-tils'
export default function Solution() {
  const [language] = usePreferredLanguages()
  return <p>{language?.startsWith('es') ? 'Hola' : 'Hello'}</p>
}
