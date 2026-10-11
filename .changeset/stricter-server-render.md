---
'@vincent.ri/react-tils': patch
---

`hookMatrix` and `componentMatrix` render on the server more like a real Node server: no `location`, and a server-side `navigator` (`en-US`). Components that read the URL or the browser's language during render now fail the check, as they would break in production.
