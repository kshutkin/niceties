# Changelog

## 1.0.2

### Patch Changes

- ae7497a: Preserve collected drafts as static text until they scroll off screen, keeping active drafts in their correct terminal rows. Restore the cursor when no active updaters remain.
- 862f619: Preserve earlier terminal output when draft updates change height. Redraws clear the previously displayed rows before writing new content, including wrapped and multiline text.

## 1.0.1

### Patch Changes

- bbce4ae: fix typos and docs

## 1.0.0

### Major Changes

- 1f04f30: Initial release

### Patch Changes

- 821b847: fix types
- a842b01: flatten packages
