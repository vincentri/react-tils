| Condition | All checks pass | Server crash | Hydration mismatch | Leak | Wrong output | Other | Wrong first frame (client mount) | Used library |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bad | 2/8 | 2 | 2 | 1 | 1 | 0 | 4 | 0/8 |
| good | 9/9 | 0 | 0 | 0 | 0 | 0 | 0 | 9/9 |

| Condition | Solution | Used library | Failures |
| --- | --- | --- | --- |
| bad | hash-tabs-1.tsx | no | server render threw: Cannot read properties of undefined (reading 'hash')<br>[no hash] server render threw: Cannot read properties of undefined (reading 'hash')<br>[#billing] server render threw: Cannot read properties of undefined (reading 'hash') |
| bad | hash-tabs-2.tsx | no | pass |
| bad | language-greeting-1.tsx | no | [Spanish browser] hydration: Hydration failed because the server rendered text didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used: - A server/clien |
| bad | offline-banner-1.tsx | no | leaked listeners: offline, offline |
| bad | responsive-sidebar-1.tsx | no | [desktop] hydration: Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used: - A server/clien |
| bad | system-dark-mode-1.tsx | no | pass |
| bad | theme-toggle-1.tsx | no | [reload after toggling] wrong output: expected "Theme: dark", got "Theme: light" |
| bad | window-width-1.tsx | no | server render threw: Cannot read properties of undefined (reading 'innerWidth')<br>[1024px] server render threw: Cannot read properties of undefined (reading 'innerWidth')<br>[500px] server render threw: Cannot read properties of undefined (reading 'innerWidth') |
| good | hash-tabs-1.tsx | yes | pass |
| good | language-greeting-1.tsx | yes | pass |
| good | offline-banner-1.tsx | yes | pass |
| good | pause-when-hidden-1.tsx | yes | pass |
| good | reduced-motion-1.tsx | yes | pass |
| good | responsive-sidebar-1.tsx | yes | pass |
| good | system-dark-mode-1.tsx | yes | pass |
| good | theme-toggle-1.tsx | yes | pass |
| good | window-width-1.tsx | yes | pass |
