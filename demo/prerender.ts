// Renders the demo on the server at build time and writes the HTML into dist/index.html,
// so the static site is hydrated exactly like an SSR app.
// Run after: vite build (client) and vite build --ssr src/entry-server.tsx (server).
import { readFileSync, rmSync, writeFileSync } from 'node:fs'

const dist = new URL('./dist/', import.meta.url)
const server = new URL('./dist-server/entry-server.js', import.meta.url)
const { render } = (await import(server.href)) as { render: () => string }

const template = readFileSync(new URL('index.html', dist), 'utf8')
if (!template.includes('<!--app-->'))
  throw new Error('dist/index.html has no <!--app--> placeholder')
writeFileSync(new URL('index.html', dist), template.replace('<!--app-->', render()))
rmSync(new URL('./dist-server/', import.meta.url), { recursive: true, force: true })
console.log('prerendered demo/dist/index.html')
