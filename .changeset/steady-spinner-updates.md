---
'@niceties/draftlog-appender': patch
---

Keep spinners animating when task messages are updated, and stop the animation timer when the last task finishes. Count changes in the resulting task status so repeated updates do not corrupt the active spinner count.
