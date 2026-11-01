---
'@niceties/node-parseargs-plus': patch
---

Preserve explicit global option values before a command instead of replacing them with defaults from the command parse. Explicit flags after the command retain precedence over earlier flags.
