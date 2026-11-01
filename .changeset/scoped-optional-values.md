---
'@niceties/node-parseargs-plus': patch
---

Scope optional-value argument rewriting to global options before a command and the selected command's merged options afterward. Required options and aliases are no longer made optional by inactive commands or shadowed global rules.
