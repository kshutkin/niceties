---
'@niceties/draftlog-appender': patch
---

Stop the animation timer when cleanup removes the last collected spinner, even when no further log messages arrive. Keep the active spinner count accurate when collected tasks are removed.
