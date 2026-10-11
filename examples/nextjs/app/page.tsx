import Link from 'next/link'
import { Widgets } from './widgets'

// A server component: the hooks run in the client component below, which Next
// renders on the server first and then hydrates.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // The request's query, so useSearchParam renders the right tab on the server.
  const { tab } = await searchParams
  return (
    <main>
      <h1>react-tils in Next.js</h1>
      <Widgets serverTab={typeof tab === 'string' ? tab : null} />
      <p>
        <Link href="/measure" data-testid="to-measure">
          Go to /measure (client-side navigation)
        </Link>
      </p>
    </main>
  )
}
