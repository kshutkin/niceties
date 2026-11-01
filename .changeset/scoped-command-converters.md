---
'@niceties/node-parseargs-plus': patch
---

Keep custom value converters scoped to their command. Apply global converters plus the selected command's overrides, without invoking converters from inactive commands.
