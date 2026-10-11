# @vincent.ri/react-tils

## 0.1.2

### Patch Changes

- a12a7ea: New hooks: `useScrollSpy` (highlight the section being read), `useAutosizeTextarea` (chat inputs that grow with their text), `usePasteFiles` (paste screenshots and files), and `useIsStuck` (style a sticky header once it sticks).

  `componentMatrix` and `hookMatrix` no longer report false leaks: listeners on elements that left the page (including the ones happy-dom adds to inputs) and React's own document listener are ignored.

- e025f38: New hooks: `usePageRestore` (refresh stale data after the Back button), `useDrag` (splitters, sliders, and dragging with pointer capture), `useAnnounce` (screen reader announcements), and `useCaretPosition` (popups at the caret in a textarea).
- 2db7b30: New hooks: `useMediaRecorder` (voice notes and recordings in a format each browser supports), `useSpeechSynthesis` (read aloud, with long text and voice loading handled), `useServiceWorkerUpdate` ("new version available" for PWAs), and `useScrollProgress` (reading progress). `useHotkey` supports sequences like `'g i'`, and `useRovingFocus` jumps to items by typed letters.

## 0.1.1

### Patch Changes

- a1d834d: Published as `@vincent.ri/react-tils` (npm rejected the unscoped name as too similar to existing packages). Releases now carry npm provenance and are published through npm trusted publishing. No code changes.

## 0.1.0

### Minor Changes

- 673c2df: First release: 47 React hooks for browser state and interaction that render the right first frame, with `react-tils/testing` (`hookMatrix`, `componentMatrix`), an `AGENTS.md` guide, and `npx react-tils init`.
