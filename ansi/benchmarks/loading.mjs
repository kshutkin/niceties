import { createRequire } from 'module';
import { dirname } from 'path';
import { compileFunction, createContext } from 'vm';

import { buildSync } from 'esbuild';
import { bench, group, run } from 'mitata';

const filename = new URL(import.meta.url).pathname;

function build(contents) {
    const root = dirname(filename);
    const result = buildSync({
        bundle: true,
        write: false,
        platform: 'node',
        format: 'cjs',
        target: 'es2020',
        stdin: { contents, loader: 'js', resolveDir: root },
    });
    const code = result.outputFiles[0].text;
    return code;
}

function compile(code, context) {
    return compileFunction(code, [], { parsingContext: context });
}

group(() => {
    const codeNiceties = build(`let ansi = require("../src/index.js"); console.log(ansi != null);`);
    const contextNiceties = createContext({
        require: createRequire(filename),
        process: { env: { FORCE_COLOR: '1' } },
    });
    bench('@niceties/ansi', () => compile(codeNiceties, contextNiceties));

    const codeP = build(`let picocolors = require("picocolors"); console.log(picocolors != null);`);
    const contextP = createContext({
        require: createRequire(filename),
        process: { env: { FORCE_COLOR: '1' } },
    });
    bench('picocolors', () => compile(codeP, contextP));

    const codeAC = build(`let ansi = require("ansi-colors"); console.log(ansi != null);`);
    const contextAC = createContext({
        require: createRequire(filename),
        process: { env: { FORCE_COLOR: '1' } },
    });
    bench('ansi-colors', () => compile(codeAC, contextAC));

    const codeK = build(`let kleur = require("kleur"); console.log(kleur != null);`);
    const contextK = createContext({
        require: createRequire(filename),
        process: { env: { FORCE_COLOR: '1' } },
    });
    bench('kleur', () => compile(codeK, contextK));

    const codeKC = build(`let kleurColors = require("kleur/colors"); console.log(kleurColors != null);`);
    const contextKC = createContext({
        require: createRequire(filename),
        process: { env: { FORCE_COLOR: '1' } },
    });
    bench('kleur/colors', () => compile(codeKC, contextKC));

    const codeC = build(`let colorette = require("colorette"); console.log(colorette != null);`);
    const contextC = createContext({
        require: createRequire(filename),
        process: { env: { FORCE_COLOR: '1' } },
    });
    bench('colorette', () => compile(codeC, contextC));

    const codeN = build(`let nanocolors = require("nanocolors"); console.log(nanocolors != null);`);
    const contextN = createContext({
        require: createRequire(filename),
        process: { env: { FORCE_COLOR: '1' } },
    });
    bench('nanocolors', () => compile(codeN, contextN));

    const codeY = build(`import * as yoctocolors from "yoctocolors"; console.log(yoctocolors != null);`);
    const contextY = createContext({
        require: createRequire(filename),
        process: { env: { FORCE_COLOR: '1' } },
    });
    bench('yoctocolors', () => compile(codeY, contextY));

    const codeCh = build(`let chalk = require("chalk"); console.log(chalk != null);`);
    const contextCh = createContext({
        require: createRequire(filename),
        process: { env: { FORCE_COLOR: '1' } },
    });
    bench('chalk', () => compile(codeCh, contextCh));
});

await run();
