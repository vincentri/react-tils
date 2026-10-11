---
'@vincent.ri/react-tils': patch
---

useCookie no longer crashes when a cookie on the page isn't URL-encoded (for example `a=100%` set by the server); such values are returned as written.
