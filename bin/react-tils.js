#!/usr/bin/env node
// `npx react-tils init`: points the project's AI agent config at node_modules/@vincent.ri/react-tils/AGENTS.md.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const LINE =
  'For React code that reads browser state, read node_modules/@vincent.ri/react-tils/AGENTS.md first.'
const CURSOR_RULE = `---
description: React hooks for browser state and interaction
alwaysApply: true
---

${LINE}
`

/**
 * Adds the pointer line to every agent config that exists, or creates CLAUDE.md
 * and AGENTS.md when there are none. Never duplicates the line.
 * @param {string} cwd
 * @returns {string[]} one message per file
 */
function init(cwd) {
  const messages = []
  const append = (file) => {
    const path = join(cwd, file)
    const current = existsSync(path) ? readFileSync(path, 'utf8') : ''
    if (current.includes(LINE)) return messages.push(`${file}: already set up`)
    const separator =
      current === '' || current.endsWith('\n\n') ? '' : current.endsWith('\n') ? '\n' : '\n\n'
    writeFileSync(path, `${current}${separator}${LINE}\n`)
    messages.push(`${file}: ${current === '' ? 'created' : 'added the pointer line'}`)
  }

  const markdown = ['CLAUDE.md', 'AGENTS.md'].filter((f) => existsSync(join(cwd, f)))
  for (const file of markdown.length > 0 ? markdown : ['CLAUDE.md', 'AGENTS.md']) append(file)

  if (existsSync(join(cwd, '.cursor'))) {
    const rule = join(cwd, '.cursor/rules/react-tils.mdc')
    if (existsSync(rule)) messages.push('.cursor/rules/react-tils.mdc: already set up')
    else {
      mkdirSync(join(cwd, '.cursor/rules'), { recursive: true })
      writeFileSync(rule, CURSOR_RULE)
      messages.push('.cursor/rules/react-tils.mdc: created')
    }
  }
  return messages
}

// No "is main module" check: npx runs this through a symlink in node_modules/.bin,
// where import.meta.url and process.argv[1] differ.
const [command] = process.argv.slice(2)
if (command === 'init') {
  for (const message of init(process.cwd())) console.log(message)
} else {
  console.log(
    'Usage: npx react-tils init\n\nPoints CLAUDE.md, AGENTS.md, and Cursor rules at the react-tils agent guide.',
  )
  process.exitCode = command ? 1 : 0
}
