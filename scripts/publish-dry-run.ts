// Fails if `npm publish` would silently change the package. npm "auto-corrects" some
// package.json fields only at publish time (it dropped our CLI once, for a `./` in the bin path),
// so `npm pack`, publint, and the install test can't see it.
import { execSync } from 'node:child_process'

const output = execSync('npm publish --dry-run --ignore-scripts 2>&1', { encoding: 'utf8' })
const corrections = output
  .split('\n')
  .filter((line) => /auto-corrected|invalid and removed/.test(line))
if (corrections.length > 0) {
  console.error(`npm publish would change package.json:\n${corrections.join('\n')}`)
  process.exit(1)
}
console.log('npm publish --dry-run: no corrections')
