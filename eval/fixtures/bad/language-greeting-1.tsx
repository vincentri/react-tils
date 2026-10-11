// reads the server's language during render: hydration mismatch for Spanish browsers
export default function Solution() {
  return <p>{navigator.language.startsWith('es') ? 'Hola' : 'Hello'}</p>
}
