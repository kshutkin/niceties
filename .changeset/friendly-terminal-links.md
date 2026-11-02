---
'@niceties/ansi': minor
---

Add `link(text, url)` to the Node.js and browser entry points for OSC 8 terminal hyperlinks. Links follow color detection in Node.js and return only the anchor text when colors are disabled; the browser entry point always emits hyperlinks. No separate hyperlink detection is performed. Supported terminals make the anchor text clickable; other terminals display the anchor text.
