---
'@niceties/draftlog-appender': minor
---

Use one draft updater per complete message, delegating multiline layout to draftlog. Keep prefixes on the first row and indent continuation rows by the current nesting indentation plus two spaces. Preserve blank lines, ANSI sequences, and Unicode text, and prevent cleanup of multiline items from overwriting subsequent messages.
