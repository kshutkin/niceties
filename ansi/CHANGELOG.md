# @niceties/ansi

## 1.2.0

### Minor Changes

- 466daa6: Add `link(text, url)` to the Node.js and browser entry points for OSC 8 terminal hyperlinks. Links follow color detection in Node.js and return only the anchor text when colors are disabled; the browser entry point always emits hyperlinks. No separate hyperlink detection is performed. Supported terminals make the anchor text clickable; other terminals display the anchor text.

## 1.1.2

### Patch Changes

- bbce4ae: fix typos and docs

## 1.1.1

### Patch Changes

- 30863c2: fix comments packaging

## 1.1.0

### Minor Changes

- 4fdc125: make exports pure and mark package as having no sideeffects

## 1.0.0

### Major Changes

- fb8159d: initial release
