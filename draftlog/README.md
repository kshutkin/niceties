# @niceties/draftlog

Create mutable log lines in the terminal.

This is a simplified and improved version of the [draftlog](https://github.com/ivanseidel/node-draftlog) package by [ivanseidel](https://github.com/ivanseidel).

## Installation

```
npm install @niceties/draftlog
```

## Usage

```js
import { draft } from "@niceties/draftlog";

// Create a draft line — it prints "Loading..." to stdout
const update = draft("Loading...");

// Later, update the same line in-place
update("Loading... 50%");

// Update again
update("Done ✔");
```

### Progress indicator example

```js
import { draft } from "@niceties/draftlog";

const update = draft("Processing: 0%");

let progress = 0;
const interval = setInterval(() => {
    progress += 10;
    update(`Processing: ${progress}%`);
    if (progress >= 100) {
        clearInterval(interval);
        update("Processing: complete ✔");
    }
}, 200);
```

### Multiple draft lines

You can create several draft lines and update them independently:

```js
import { draft } from "@niceties/draftlog";

const updateTask1 = draft("[task 1] waiting...");
const updateTask2 = draft("[task 2] waiting...");
const updateTask3 = draft("[task 3] waiting...");

// Each updater modifies only its own line
updateTask1("[task 1] done ✔");
updateTask2("[task 2] in progress...");
// ...
updateTask2("[task 2] done ✔");
updateTask3("[task 3] done ✔");
```

### Compatible with regular output

Regular `console.log()` and `process.stdout.write()` calls work seamlessly alongside draft lines. External output is inserted above the draft block, and the draft lines are re-rendered below it:

```js
import { draft } from "@niceties/draftlog";

const update = draft("Status: working...");

console.log("This line appears above the draft");

update("Status: done ✔");
```

## API

### `draft(text: string): (text: string) => void`

Writes `text` to stdout as a new line and returns an **updater function**. Calling the updater replaces the content of that line in-place.

- **`text`** — the initial text to display.
- **Returns** — a function that accepts a new string and updates the line.

Updates are batched: multiple calls to the updater within the same tick are coalesced into a single re-render on `process.nextTick`.

## Behavior

### TTY (interactive terminal)

When stdout is a TTY, draft lines are rendered using ANSI escape sequences:

- The cursor is hidden while any draft lines are active.
- Lines are updated in-place by moving the cursor and clearing content.
- Wide / CJK characters are measured correctly using [string-width](https://github.com/sindresorhus/string-width).
- If draft lines exceed the terminal viewport, only the lines that fit are re-rendered (lines that scroll off the top are dropped).
- On terminal resize, visible draft lines are re-rendered automatically.
- The cursor is restored on process exit.

### Non-TTY (piped / redirected output)

When stdout is not a TTY (e.g. piped to a file or another process), the library falls back to a simple mode:

- `draft(text)` writes `text` followed by a newline.
- Each call to the updater writes the new text as a new line.
- No ANSI escape sequences are emitted.

This means output remains clean and readable when redirected.

### Automatic cleanup

Draft lines are tracked using a [`FinalizationRegistry`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry). When an updater function is garbage-collected, its corresponding line is removed from tracking. If all draft lines are removed, the cursor is shown again automatically.

## Prior art

- [draftlog](https://github.com/ivanseidel/node-draftlog)

### [Changelog](./CHANGELOG.md)

## License

[MIT](https://github.com/kshutkin/niceties/blob/main/LICENSE)
