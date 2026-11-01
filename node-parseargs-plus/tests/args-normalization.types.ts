import { parseArgsPlus } from '@niceties/node-parseargs-plus';
import { commands } from '@niceties/node-parseargs-plus/commands';
import { optionalValue } from '@niceties/node-parseargs-plus/optional-value';

const plain = parseArgsPlus({ options: { name: { type: 'string', default: 'default' } } });
plain.values.name satisfies string;

const result = parseArgsPlus(
    {
        args: undefined,
        tokens: true,
        commands: { run: { options: { filter: { type: 'string', optionalValue: true } } } },
    },
    [commands, optionalValue]
);
if (result.command === 'run') result.values.filter satisfies string | undefined;
result.tokens satisfies { index: number }[];

const explicitEmpty = parseArgsPlus({ args: [], options: { verbose: { type: 'boolean', default: false } } });
explicitEmpty.values.verbose satisfies boolean;
