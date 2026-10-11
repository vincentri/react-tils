import Link from 'next/link'
import { Widgets } from './widgets'

// A server component: the hooks run in the client component below, which Next
// renders on the server first and then hydrates.
export default function Home() {
  return (
    <main>
      <h1>react-tils in Next.js</h1>
      <Widgets />
      <p>
        <Link href="/measure" data-testid="to-measure">
          Go to /measure (client-side navigation)
        </Link>
      </p>
    </main>
  )
}
