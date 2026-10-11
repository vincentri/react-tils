import type { ReactNode } from 'react'

export const metadata = { title: 'react-tils in Next.js' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>{children}</body>
    </html>
  )
}
