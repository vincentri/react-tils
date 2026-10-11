// Task prompts, kept free of test imports so the runner can load them in plain Node.

const descriptions: Record<string, string> = {
  'responsive-sidebar':
    'Render `<aside>Sidebar</aside>` when the viewport is at least 768px wide. Below 768px, render `<button>Menu</button>` instead. Update when the viewport changes.',
  'window-width':
    'Render the current window inner width as text in the form `Width: 1024`. Update when the window is resized.',
  'theme-toggle':
    'Render a `<button>` labeled `Theme: light` or `Theme: dark` (default light). Clicking it toggles the theme. The choice must persist across page reloads using localStorage.',
  'offline-banner':
    'Render `You are offline` when the browser has no network connection, and `Online` otherwise. Update when connectivity changes.',
  'pause-when-hidden':
    'Render `Polling` while the browser tab is visible and `Paused` while the tab is hidden (user switched tabs or minimized). Update when it changes.',
  'system-dark-mode':
    "Render `Dark` if the user's operating system prefers a dark color scheme, otherwise `Light`. Update if the OS setting changes.",
  'reduced-motion':
    'Render `Animations off` if the user prefers reduced motion, otherwise `Animations on`. Update if the setting changes.',
  'hash-tabs':
    'Render `Billing` when the URL hash is `#billing`, otherwise `Profile`. Update when the hash changes.',
  'language-greeting':
    "Render `Hola` if the user's preferred browser language is Spanish, otherwise `Hello`.",
}

const templates = {
  // Tells the agent about SSR: tests whether it avoids the bugs when warned.
  explicit: (description: string): string =>
    `This is a React 19 app that is server-side rendered (like Next.js) and then hydrated in the browser.

Create \`Solution.tsx\` in the current directory with a default-exported React component \`Solution\` that takes no props and does the following:

${description}

It must work correctly both on the server and in the browser. Only create that one file. Do not install packages or run commands.`,
  // A normal request in a Next.js-shaped project: SSR is implied, never mentioned.
  realistic: (description: string): string =>
    `Create \`Solution.tsx\` in the project root: a default-exported \`Solution\` component (no props). It's already imported by app/page.tsx.

${description}

Only create that one file. Do not install packages or run commands.`,
}

export type Variant = keyof typeof templates

export const promptsFor = (variant: Variant): Array<{ id: string; prompt: string }> =>
  Object.entries(descriptions).map(([id, description]) => ({
    id,
    prompt: templates[variant](description),
  }))
