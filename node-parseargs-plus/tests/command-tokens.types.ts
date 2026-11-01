import { parseArgsPlus } from '@niceties/node-parseargs-plus';
import { commands } from '@niceties/node-parseargs-plus/commands';
import { optionalValue } from '@niceties/node-parseargs-plus/optional-value';

const result = parseArgsPlus(
    {
        args: ['build', '--name', 'test'],
        tokens: true,
        commands: { build: { options: { name: { type: 'string' } } } },
    },
    [commands]
);

for (const token of result.tokens) {
    token.index satisfies number;
    if (token.kind === 'option') {
        token.name satisfies string;
        token.rawName satisfies string;
        token.value satisfies string | undefined;
        token.inlineValue satisfies boolean | undefined;
        // @ts-expect-error Tokens keep raw strings, even for converted options.
        token.value satisfies number;
    } else if (token.kind === 'positional') {
        token.value satisfies string;
    } else {
        token.kind satisfies 'option-terminator';
        // @ts-expect-error Option terminators do not carry values.
        token.value;
    }
}

const implicit = parseArgsPlus(
    {
        args: ['--name'],
        tokens: true,
        defaultCommand: 'build',
        commands: { build: { options: { name: { type: 'string', optionalValue: true } } } },
    },
    [commands, optionalValue]
);
implicit.tokens satisfies typeof result.tokens;

const withoutTokens = parseArgsPlus({ args: ['build'], tokens: false, commands: { build: {} } }, [commands]);
// @ts-expect-error Tokens are present only when requested.
withoutTokens.tokens;
