---
'@vincent.ri/react-tils': patch
---

Smaller hooks, same behavior: `useClickOutside` (-37%), `usePageRestore` (-42%), `useHotkey` (-21%), and `useEventListener` (-12%) add their own listener instead of going through a general-purpose one, and the 16 hooks that always call your latest callback are 3-9% smaller.
