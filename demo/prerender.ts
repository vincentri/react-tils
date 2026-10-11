// Renders the site on the server at build time: dist/index.html (every demo) and one page per hook
// at dist/hooks/<name>/index.html, plus sitemap.xml. The static site then hydrates exactly like
// an SSR app. Run after: vite build (client) and vite build --ssr src/entry-server.tsx (server).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

type Page = { path: string; title: string; description: string }
const dist = new URL('./dist/', import.meta.url)
const server = new URL('./dist-server/entry-server.js', import.meta.url)
const { render, pages } = (await import(server.href)) as {
  render: (path: string) => string
  pages: Page[]
}
const { homepage } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { homepage: string }

const template = readFileSync(new URL('index.html', dist), 'utf8')
if (!/<meta\s+name="description"/.test(template))
  throw new Error('dist/index.html has no meta description')
if (!template.includes('<!--app-->'))
  throw new Error('dist/index.html has no <!--app--> placeholder')
const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

writeFileSync(new URL('index.html', dist), template.replace('<!--app-->', render('')))
for (const page of pages) {
  const html = template
    .replace('<!--app-->', render(page.path))
    .replace(/<title>.*<\/title>/, `<title>${escape(page.title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"/,
      `<meta name="description" content="${escape(page.description)}"`,
    )
  const dir = new URL(page.path, dist)
  mkdirSync(dir, { recursive: true })
  writeFileSync(new URL('index.html', dir), html)
}
const urls = ['', ...pages.map((page) => page.path)].map(
  (path) => `  <url><loc>${homepage}${path}</loc></url>`,
)
writeFileSync(
  new URL('sitemap.xml', dist),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
)
rmSync(new URL('./dist-server/', import.meta.url), { recursive: true, force: true })
console.log(`prerendered demo/dist: home and ${pages.length} pages, sitemap.xml`)
