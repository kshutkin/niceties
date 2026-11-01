---
'@niceties/node-parseargs-plus': patch
---

Resolve omitted CLI arguments once in `parseArgsPlus` before running middleware. Command and optional-value middleware now use the prepared argument list rather than providing their own process argv fallback.
