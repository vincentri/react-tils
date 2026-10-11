---
'@vincent.ri/react-tils': minor
---

New hooks: `useScrollSpy` (highlight the section being read), `useAutosizeTextarea` (chat inputs that grow with their text), `usePasteFiles` (paste screenshots and files), and `useIsStuck` (style a sticky header once it sticks).

`componentMatrix` and `hookMatrix` no longer report false leaks: listeners on elements that left the page (including the ones happy-dom adds to inputs) and React's own document listener are ignored.
