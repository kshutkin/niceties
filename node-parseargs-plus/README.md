# @niceties/node-parseargs-plus

Enhanced wrapper around Node.js built-in [`util.parseArgs`](https://nodejs.org/api/util.html#utilparseargsconfig) with typed results, a middleware system, and built-in help/version/commands/parameters support.

## Installation

```
npm install @niceties/node-parseargs-plus
```

## Quick Start

```js
import { parseArgsPlus } from "@niceties/node-parseargs-plus";
import { help } from "@niceties/node-parseargs-plus/help";

const { values, positionals } = parseArgsPlus(
    {
        name: "my-cli",
        version: "1.0.0",
        description: "A handy CLI tool",
        options: {
            output: {
                type: "string",
                short: "o",
                description: "Output file path",
            },
            verbose: {
                type: "boolean",
                short: "V",
                description: "Enable verbose logging",
            },
        },
        allowPositionals: true,
    },
    [help],
);

console.log(values.output); // string | undefined
console.log(values.verbose); // boolean | undefined
console.log(positionals); // string[]
```

Running `my-cli --help` prints:

```
my-cli v1.0.0

A handy CLI tool

Usage:
  my-cli [options] [arguments]

Options:
      --output <value>  Output file path
  -V, --verbose         Enable verbose logging
  -h, --help            Show this help message
  -v, --version         Show version number
```

## API

### `parseArgsPlus(config, middlewares?)`

```js
import { parseArgsPlus } from "@niceties/node-parseargs-plus";
```

Parses command-line arguments using Node.js `util.parseArgs` under the hood, with full TypeScript inference for the result.

#### Config

| Property           | Type                           | Description                                                                     |
| ------------------ | ------------------------------ | ------------------------------------------------------------------------------- |
| `options`          | `Record<string, OptionConfig>` | Option definitions (same shape as `util.parseArgs`).                            |
| `allowPositionals` | `boolean`                      | Whether to allow positional arguments.                                          |
| `allowNegative`    | `boolean`                      | Whether to allow `--no-*` negation of boolean flags.                            |
| `strict`           | `boolean`                      | When `true`, throws on unknown options (default behaviour of `util.parseArgs`). |
| `args`             | `string[]`                     | Arguments to parse. Defaults to `process.argv.slice(2)`.                        |
| `tokens`           | `boolean`                      | When `true`, includes a `tokens` array in the result.                           |

Each option in `options` follows the `OptionConfig` shape:

| Property   | Type                                         | Description                                                               |
| ---------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| `type`     | `'string' \| 'boolean'`                      | The option type.                                                          |
| `short`    | `string`                                     | Single-character alias (e.g. `'o'` for `-o`).                             |
| `multiple` | `boolean`                                    | Allow the option to be specified multiple times (value becomes an array). |
| `default`  | `string \| boolean \| string[] \| boolean[]` | Default value when the option is not provided.                            |

#### Result

Returns an object with:

- **`values`** - parsed option values, fully typed based on your config.
- **`positionals`** - array of positional arguments (when `allowPositionals` is `true`).
- **`tokens`** - raw token array (when `tokens` is `true`).

### `help` middleware

```js
import { help } from "@niceties/node-parseargs-plus/help";
```

Adds `--help` / `-h` and `--version` / `-v` flags. When either flag is passed, the appropriate output is printed and the process exits with code `0`. The `help` and `version` keys are removed from the returned `values`.

The middleware extends the config with these top-level fields:

| Property       | Type                          | Required | Description                                                     |
| -------------- | ----------------------------- | -------- | --------------------------------------------------------------- |
| `name`         | `string`                      | yes      | Program name shown in the header and usage line.                |
| `version`      | `string`                      | yes      | Version string printed for `--version` and in the header.       |
| `description`  | `string`                      | no       | Description displayed between the header and the usage section. |
| `helpSections` | `Record<string, HelpSection>` | no       | Custom or overridden help sections (see below).                 |

It also extends each option with an optional `description` field that is displayed in the options table.

### `parameters` middleware

```js
import { parameters } from "@niceties/node-parseargs-plus/parameters";
```

Adds typed positional parameter support. Instead of working with a raw `positionals` array, you declare named parameters and get a strongly-typed `parameters` object in the result.

```js
import { parseArgsPlus } from "@niceties/node-parseargs-plus";
import { help } from "@niceties/node-parseargs-plus/help";
import { parameters } from "@niceties/node-parseargs-plus/parameters";

const result = parseArgsPlus(
    {
        name: "deploy",
        version: "0.5.0",
        description: "Deploy packages to a target environment.",
        options: {
            verbose: {
                type: "boolean",
                short: "V",
                description: "Enable verbose logging.",
            },
            registry: {
                type: "string",
                short: "r",
                description: "Package registry URL.",
            },
        },
        parameters: ["<environment>", "[packages...]"],
    },
    [help, parameters],
);

// result.parameters.environment → string          (required)
// result.parameters.packages   → string[] | undefined (optional spread)
// result.values.verbose        → boolean | undefined
```

#### Parameter syntax

Each string in the `parameters` array must use one of these patterns:

| Syntax      | Meaning                                 | Result type             |
| ----------- | --------------------------------------- | ----------------------- |
| `<name>`    | Required single value                   | `string`                |
| `[name]`    | Optional single value                   | `string \| undefined`   |
| `<name...>` | Required variadic (one or more values)  | `string[]`              |
| `[name...]` | Optional variadic (zero or more values) | `string[] \| undefined` |

Parameter names may contain letters, digits, spaces, and hyphens. They are converted to **camelCase** in the result object:

- `<package name>` → `parameters.packageName`
- `<save-dev>` → `parameters.saveDev`
- `[input files...]` → `parameters.inputFiles`

#### Validation rules

These rules are enforced at **both** compile time (TypeScript) and runtime:

1. **Required before optional** - all `<required>` parameters must come before `[optional]` ones.
2. **At most one spread** - only one `...` parameter is allowed.
3. **Spread is last** - the spread parameter must be the last in the array.

Invalid configurations produce a compile-time error and throw at runtime:

```js
// ❌ TypeScript error: required after optional
parameters: ["[opt]", "<req>"];

// ❌ TypeScript error: spread not last
parameters: ["<files...>", "<name>"];

// ❌ TypeScript error: multiple spreads
parameters: ["<a...>", "<b...>"];
```

#### Config extension

The middleware extends the config with:

| Property     | Type                | Required | Description                                          |
| ------------ | ------------------- | -------- | ---------------------------------------------------- |
| `parameters` | `readonly string[]` | yes      | Positional parameter definitions (see syntax above). |

#### Result extension

The middleware adds a `parameters` object to the result, with keys derived from the parameter names and types inferred from the syntax (required vs optional, single vs spread).

#### Middleware ordering

| `transformConfig.order` | `transformResult.order` | Rationale                                                                   |
| ----------------------- | ----------------------- | --------------------------------------------------------------------------- |
| `0` (default)           | `5`                     | Enables `allowPositionals` normally; maps positionals before commands/help. |

### `commands` middleware

```js
import { commands } from "@niceties/node-parseargs-plus/commands";
```

Adds subcommand support with a two-pass parsing strategy. See the [commands + help cooperation](#commands--help-cooperation) section below for details on how they work together.

### `camelCase` middleware

```js
import { camelCase } from "@niceties/node-parseargs-plus/camel-case";
```

Bridges camelCase JS option keys and kebab-case CLI flags. Users define options with camelCase keys in their config, and the middleware automatically converts them to kebab-case for `parseArgs` (so that CLI flags follow the `--kebab-case` convention), then converts the result values back to camelCase.

```js
import { parseArgsPlus } from "@niceties/node-parseargs-plus";
import { camelCase } from "@niceties/node-parseargs-plus/camel-case";
import { help } from "@niceties/node-parseargs-plus/help";

const { values } = parseArgsPlus(
    {
        name: "my-cli",
        version: "1.0.0",
        options: {
            saveDev: {
                type: "boolean",
                short: "D",
                description: "Save as a dev dependency",
            },
            outputDir: {
                type: "string",
                short: "o",
                description: "Output directory",
            },
        },
    },
    [camelCase, help],
);

// CLI:  my-cli --save-dev --output-dir ./dist
// JS:   values.saveDev === true
//       values.outputDir === './dist'
```

Running `my-cli --help` prints kebab-case flags:

```
my-cli v1.0.0

Usage:
  my-cli [options]

Options:
  -D, --save-dev              Save as a dev dependency
  -o, --output-dir <value>    Output directory
  -h, --help                  Show this help message
  -v, --version               Show version number
```

#### Conversion rules

| camelCase key   | CLI flag            | Result key      |
| --------------- | ------------------- | --------------- |
| `saveDev`       | `--save-dev`        | `saveDev`       |
| `outputDir`     | `--output-dir`      | `outputDir`     |
| `verbose`       | `--verbose`         | `verbose`       |
| `enableSsr`     | `--enable-ssr`      | `enableSsr`     |
| `useHttpsProxy` | `--use-https-proxy` | `useHttpsProxy` |

> **Note:** The camelCase → kebab-case → camelCase roundtrip is lossy for acronyms.
> If you define `enableSSR`, it converts to `--enable-ssr`, which converts back to `enableSsr` (not `enableSSR`).
> Use standard camelCase (`enableSsr`) for consistent results.

#### What is and isn't converted

- **Option keys** in `config.options` — converted (camelCase → kebab-case in config, kebab-case → camelCase in result)
- **Command option keys** in `config.commands.*.options` — converted
- **Command names** — not converted (`run-script` stays `run-script`)
- **Parameter names** — not converted (the `parameters` middleware has its own camelCase conversion)
- **Token names** — not converted (tokens are a low-level API; `token.name` retains the kebab-case form, `token.rawName` is unchanged)
- **`short` aliases** — not converted (single characters)

#### Works with `allowNegative`

When `allowNegative: true` is set, negated flags work as expected:

```js
const { values } = parseArgsPlus(
    {
        options: {
            useColor: { type: "boolean" },
        },
        allowNegative: true,
    },
    [camelCase],
);

// CLI:  my-cli --no-use-color
// JS:   values.useColor === false
```

#### Middleware ordering

| `transformConfig.order` | `transformResult.order` | Rationale                                                                                                                                                  |
| ----------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `5`                     | `15`                    | Converts option keys after help adds its options (-10), before commands merges them (10). Result conversion runs after commands (10) but before help (20). |

### `optionalValue` middleware

```js
import { optionalValue } from "@niceties/node-parseargs-plus/optional-value";
```

Allows `type: 'string'` options to be used **bare** on the command line (without a following value). When an option is marked with `optionalValue: true`, using it without a value produces an empty string `""` in the parsed result instead of throwing an error.

```js
import { parseArgsPlus } from "@niceties/node-parseargs-plus";
import { optionalValue } from "@niceties/node-parseargs-plus/optional-value";

const { values } = parseArgsPlus(
    {
        options: {
            filter: {
                type: "string",
                short: "f",
                optionalValue: true,
                description: "Filter results (omit value to match all)",
            },
        },
        args: process.argv.slice(2),
    },
    [optionalValue],
);

// --filter pattern  → values.filter === "pattern"
// --filter          → values.filter === ""
// -f pattern        → values.filter === "pattern"
// -f                → values.filter === ""
// --filter=         → values.filter === ""
// (not passed)      → values.filter === undefined
```

#### How it works

The middleware pre-processes the `args` array **before** `parseArgs` sees it:

- A bare long option `--option` (no `=`) is rewritten to `--option=` (inline empty value).
- A bare short option `-o` is followed by an injected empty string `''`.

The middleware only affects options with **both** `type: 'string'` and `optionalValue: true`. Boolean options and regular string options are untouched.

#### `multiple: true`

Works with `multiple: true` string options as well. Each bare occurrence adds an empty string to the array:

```js
const { values } = parseArgsPlus(
    {
        options: {
            filter: { type: "string", multiple: true, optionalValue: true },
        },
        args: ["--filter", "a", "--filter"],
    },
    [optionalValue],
);
// values.filter === ["a", ""]
```

#### Default values

When the option is not passed at all, the `default` value is used as normal. However, when used bare (`--filter` with no value), the explicit empty string `""` **overrides** the default:

```js
const { values } = parseArgsPlus(
    {
        options: {
            filter: { type: "string", optionalValue: true, default: "all" },
        },
        args: ["--filter"],
    },
    [optionalValue],
);
// values.filter === ""  (bare use overrides default)
```

```js
const { values } = parseArgsPlus(
    {
        options: {
            filter: { type: "string", optionalValue: true, default: "all" },
        },
        args: [],
    },
    [optionalValue],
);
// values.filter === "all"  (not passed, default applies)
```

#### Help output

When used with the `help` middleware, options with `optionalValue: true` display `[<value>]` (bracketed) instead of the usual `<value>` suffix, signalling that the value is optional:

```
  -f, --filter [<value>]  Filter results (omit value to match all)
      --name <value>      Your name
```

#### Cooperation with other middlewares

- **`camelCase`** — works seamlessly. Define options with camelCase keys as usual; the middleware rewrites args after camelCase converts to kebab-case (config order 5 → 6).
- **`commands`** — command-level options with `optionalValue: true` are handled. The args are rewritten before command resolution (config order 6 → 10).
- **`parameters`** — works alongside parameters without interference.
- **`help`** — shows `[<value>]` for optional-value options.
- **`customValue`** — the two middlewares operate on **different** options. Use `optionalValue` on regular `type: 'string'` options only; `customValue` handles function-typed options.

#### Middleware ordering

| `transformConfig.order` | `transformResult.order` | Rationale                                                                                                     |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `6`                     | `0`                     | Rewrites args after camelCase (5) converts keys but before commands (10). No result transformation is needed. |

### `customValue` middleware

```js
import { customValue } from "@niceties/node-parseargs-plus/custom-value";
```

Allows an option's `type` to be a **function** (constructor or transform) instead of the usual `'string'` or `'boolean'`. The middleware replaces the function with `'string'` before `parseArgs` sees it, then calls the function on each parsed string value to produce the final result.

```js
import { parseArgsPlus } from "@niceties/node-parseargs-plus";
import { customValue } from "@niceties/node-parseargs-plus/custom-value";
import { help } from "@niceties/node-parseargs-plus/help";

const { values } = parseArgsPlus(
    {
        name: "my-cli",
        version: "1.0.0",
        options: {
            port: {
                type: Number,
                short: "p",
                description: "Port to listen on",
            },
            tags: {
                type: (v) => v.split(","),
                description: "Comma-separated tags",
            },
            data: {
                type: JSON.parse,
                description: "Inline JSON config",
            },
            verbose: {
                type: "boolean",
                short: "V",
                description: "Verbose output",
            },
        },
    },
    [customValue, help],
);

// CLI:  my-cli --port 8080 --tags a,b,c --data '{"x":1}' --verbose
// JS:   values.port    === 8080          (number)
//       values.tags    === ['a','b','c'] (string[])
//       values.data    === { x: 1 }      (object)
//       values.verbose === true           (boolean, unaffected)
```

Any function that accepts a single `string` argument works — built-in constructors like `Number`, `Boolean`, `URL`, and `Date`, as well as utilities like `JSON.parse` or custom arrow functions.

#### How it works

1. **Config phase** — scans all options (global and command-level). For every option whose `type` is a function, stashes the function and replaces `type` with `'string'`.
2. **Result phase** — for each parsed value, looks up the stashed function and calls it on the string to produce the final value.

#### `multiple: true`

When an option is marked `multiple: true`, each occurrence is individually transformed:

```js
const { values } = parseArgsPlus(
    {
        options: {
            port: { type: Number, multiple: true },
        },
        args: ["--port", "80", "--port", "443"],
    },
    [customValue],
);
// values.port === [80, 443]
```

#### Default values

Default values specified via `default` **are** transformed. `parseArgs` places them into `values` as plain strings, which are indistinguishable from CLI-provided values at the middleware level.

```js
const { values } = parseArgsPlus(
    {
        options: {
            port: { type: Number, default: "3000" },
        },
        args: [],
    },
    [customValue],
);
// values.port === 3000  (Number('3000'))
```

#### TypeScript note

At the TypeScript level, the `type` field on options remains constrained to `'string' | 'boolean'`. Function-typed `type` values are a **runtime-only** convenience. In `.ts` files, use `as any` if you want to pass a function directly:

```ts
options: {
    port: { type: Number as any, description: "Port number" },
}
```

The inferred result type for such options will be `string` (the underlying `parseArgs` type). If you need precise typing, assert the result or use a wrapper.

#### Cooperation with other middlewares

- **`camelCase`** — works seamlessly. Option keys are converted to kebab-case before function extraction, so the stashed map uses kebab-case keys matching the values at transform time.
- **`commands`** — command-level options with function `type` are handled. The functions are extracted in the config phase (order 7) before command resolution (order 10).
- **`help`** — function-typed options show `<value>` in help output (they become `type: 'string'` internally).
- **`optionalValue`** — the two middlewares work side by side on **different** options. Because `optionalValue` (config order 6) runs before `customValue` (config order 7), it doesn't recognise function-typed options as strings. Use `optionalValue` on regular `type: 'string'` options only.

#### Middleware ordering

| `transformConfig.order` | `transformResult.order` | Rationale                                                                                                                                                                         |
| ----------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `7`                     | `12`                    | Extracts functions after camelCase (5) and optionalValue (6) but before commands (10). Result transform runs after commands (10) merges values but before camelCase (15) renames. |

## Custom Help Sections

The `helpSections` property lets you add extra sections to the help output or override the built-in ones. Each key is a **section id** and the value is a `HelpSection` object:

| Property | Type                 | Description                                                                                 |
| -------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `title`  | `string`             | Section heading, displayed in bright white.                                                 |
| `text`   | `string \| string[]` | Body text displayed below the title, indented. Can be a single string or an array of lines. |
| `order`  | `number`             | Controls position relative to other sections. Lower numbers appear first.                   |

### Built-in section ids and default orders

| Id        | Default title | Default order | Description                                                 |
| --------- | ------------- | ------------- | ----------------------------------------------------------- |
| `usage`   | `Usage`       | `0`           | Auto-generated usage line (`<name> [options] [arguments]`). |
| `options` | `Options`     | `1`           | Auto-generated options table from option configs.           |

Custom sections default to order `2` (after options) when `order` is not specified.

### Adding custom sections

```js
parseArgsPlus(
    {
        name: "my-cli",
        version: "1.0.0",
        options: {
            output: { type: "string", short: "o", description: "Output file" },
        },
        helpSections: {
            examples: {
                title: "Examples",
                text: [
                    "my-cli -o out.txt file.txt",
                    "my-cli --output result.json data.csv",
                ],
            },
            environment: {
                title: "Environment Variables",
                text: "MY_CLI_DEBUG=1  Enable debug mode",
                order: 3,
            },
        },
    },
    [help],
);
```

Running `--help` with the config above prints:

```
my-cli v1.0.0

Usage:
  my-cli [options]

Options:
  -o, --output <value>  Output file
  -h, --help            Show this help message
  -v, --version         Show version number

Examples:
  my-cli -o out.txt file.txt
  my-cli --output result.json data.csv

Environment Variables:
  MY_CLI_DEBUG=1  Enable debug mode
```

### Overriding built-in sections

Use the reserved ids `"usage"` or `"options"` to customise the built-in sections. Only the properties you provide are overridden; the rest keep their defaults.

```js
helpSections: {
    // Change the title but keep auto-generated usage text
    usage: { title: 'How to use' },

    // Change the title but keep auto-generated options table
    options: { title: 'Flags' },
}
```

You can also replace the body text entirely:

```js
helpSections: {
    usage: { title: 'Usage', text: 'my-cli <command> [flags]' },
}
```

### Reordering sections

Use `order` to control the position of any section, including built-in ones:

```js
helpSections: {
    // Move options before usage
    options: { title: 'Options', order: -1 },
    usage: { title: 'Usage', order: 1 },
    // Place a custom section between them
    intro: { title: 'About', text: 'A brief introduction.', order: 0 },
}
```

## Writing Custom Middleware

A middleware is a two-element tuple where each function can carry an `order` property to control execution priority:

```js
// [0] transformConfig - runs before parsing
function transformConfig(config) {
    return { ...config /* modify config */ };
}
transformConfig.order = 0; // optional, default 0 - lower runs earlier

// [1] transformResult - runs after parsing
function transformResult(result, config) {
    return { ...result /* modify result */ };
}
transformResult.order = 0; // optional, default 0 - lower runs earlier

const myMiddleware = [transformConfig, transformResult];

const result = parseArgsPlus(
    {
        /* config */
    },
    [myMiddleware, help],
);
```

- `transformConfig` functions are sorted by `order` (lower values run first).
- `transformResult` functions are sorted by `order` (lower values run first).
- Middlewares with equal order values preserve their array position (stable sort).
- `transformResult` receives the fully transformed config (after all `transformConfig` calls), so middlewares can read state set by other middlewares.

### Middleware ordering

Each transform function can declare its own execution priority via the `order` property. Defaults to `0`.

| Middleware      | `transformConfig.order` | `transformResult.order` | Rationale                                                                                        |
| --------------- | ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| `help`          | `-10`                   | `20`                    | Adds `--help`/`--version` to global options early; intercepts them after commands merges values. |
| _(default)_     | `0`                     | `0`                     | Normal priority.                                                                                 |
| `parameters`    | `0`                     | `5`                     | Enables `allowPositionals` normally; maps positionals before commands/help.                      |
| `camelCase`     | `5`                     | `15`                    | Converts option keys after help adds its options; result conversion after commands, before help. |
| `optionalValue` | `6`                     | `0`                     | Rewrites args after camelCase converts keys; no result transformation needed.                    |
| `customValue`   | `7`                     | `12`                    | Extracts function types after camelCase/optionalValue; transforms values after commands.         |
| `commands`      | `10`                    | `10`                    | Resolves the command after all options are known; does pass-2 parsing last.                      |

Because ordering is explicit, the array order you pass to `parseArgsPlus` doesn't matter - `[help, commands]` and `[commands, help]` behave identically.

### TypeScript support

Middlewares can declare type extensions for options and config using the `Middleware` type:

```ts
import type { Middleware } from "@niceties/node-parseargs-plus";

interface MyOptionExt {
    myField?: string;
}

interface MyConfigExt {
    myGlobalSetting: boolean;
}

export const myMiddleware: Middleware<MyOptionExt, MyConfigExt> = [
    (config) => config,
    (result, config) => result,
];
```

When passed to `parseArgsPlus`, the extensions are merged so that `config.options` entries accept `myField` and the top-level config requires `myGlobalSetting`.

### [Changelog](./CHANGELOG.md)

## License

[MIT](https://github.com/kshutkin/niceties/blob/main/LICENSE)
