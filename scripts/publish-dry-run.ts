// Fails if `npm publish` would silently change the package. npm "auto-corrects" some
// package.json fields only at publish time (it dropped our CLI once, for a `./` in the bin path),
// so `npm pack`, publint, and the install test can't see it.
import { spawnSync } from 'node:child_process'

// The exit code is ignored: the dry run also errors when this version is already on npm, which
// is the normal state between releases. Only the corrections matter here.
const result = spawnSync('npm', ['publish', '--dry-run', '--ignore-scripts'], { encoding: 'utf8' })
const output = `${result.stdout}${result.stderr}`
if (!output.includes('Tarball Contents')) {
  console.error(`npm publish --dry-run did not run:\n${output}`)
  process.exit(1)
}
const corrections = output
  .split('\n')
  .filter((line) => /auto-corrected|invalid and removed/.test(line))
if (corrections.length > 0) {
  console.error(`npm publish would change package.json:\n${corrections.join('\n')}`)
  process.exit(1)
}
console.log('npm publish --dry-run: no corrections')
