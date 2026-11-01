import { parseArgsPlus } from '@niceties/node-parseargs-plus';
import { commands } from '@niceties/node-parseargs-plus/commands';
import { customValue } from '@niceties/node-parseargs-plus/custom-value';
import { optionalValue } from '@niceties/node-parseargs-plus/optional-value';

const result = parseArgsPlus(
    {
        args: ['optional', '--port'],
        commands: {
            required: { options: { port: { type: 'string', short: 'p' } } },
            optional: { options: { port: { type: Number, short: 'p', optionalValue: true, default: '80' } } },
        },
    },
    [commands, optionalValue, customValue]
);

if (result.command === 'required') result.values.port satisfies string | undefined;
if (result.command === 'optional') {
    result.values.port satisfies number;
    // @ts-expect-error Optional raw text is converted before reaching the caller.
    result.values.port satisfies string;
}
