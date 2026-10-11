// Release step for changesets/action: publishes with the npm CLI, which attaches provenance in
// GitHub Actions (pnpm publish ignored it), and skips versions already on npm so ordinary pushes
// to main don't fail. Fails unless npm really has the version with provenance, then creates the
// git tag and GitHub release. The build already ran in `pnpm check`, so publish skips lifecycle
// scripts.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const { name, version } = JSON.parse(readFileSync('package.json', 'utf8')) as {
  name: string
  version: string
}

try {
  execSync(`npm view ${name}@${version} version`, { stdio: 'pipe' })
  console.log(`${name}@${version} is already on npm`)
  process.exit(0)
} catch {
  // Not published yet.
}

// Trusted publishing needs npm 11.5.1 or newer.
console.log(`npm ${execSync('npm --version', { encoding: 'utf8' }).trim()}`)
execSync('npm publish --provenance --access public --ignore-scripts', { stdio: 'inherit' })

// A publish can report success without reaching npm; check the registry for the version and
// its provenance before tagging.
const attestation = (): string => {
  try {
    return execSync(`npm view ${name}@${version} dist.attestations.provenance.predicateType`, {
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim()
  } catch {
    return ''
  }
}
let found = ''
for (let i = 0; i < 12 && !found; i++) {
  found = attestation()
  if (!found) execSync('sleep 10')
}
if (!found) throw new Error(`${name}@${version} is not on npm with provenance`)
console.log(`${name}@${version} is on npm with provenance (${found})`)

// Tag and GitHub release, with this version's changelog section as notes. (`changeset tag`
// only shows a spinner, so changesets/action never saw a new tag and made no release.)
const changelog = readFileSync('CHANGELOG.md', 'utf8')
const notes = changelog.split(`## ${version}\n`)[1]?.split('\n## ')[0]?.trim() ?? ''
const tag = `${name}@${version}`
execSync(
  `gh release create ${tag} --target ${process.env.GITHUB_SHA} --title ${tag} --notes-file -`,
  { input: `${notes}\n\nInstall: \`npm install ${name}\``, stdio: ['pipe', 'inherit', 'inherit'] },
)
