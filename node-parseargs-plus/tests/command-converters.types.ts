import { parseArgsPlus } from '@niceties/node-parseargs-plus';
import { commands } from '@niceties/node-parseargs-plus/commands';
import { customValue } from '@niceties/node-parseargs-plus/custom-value';

const result = parseArgsPlus(
    {
        args: ['number', '--port', '42'],
        options: { timeout: { type: Number, default: '10' } },
        commands: {
            number: { options: { port: { type: Number, default: '80' } } },
            text: { options: { port: { type: (value: string) => `text:${value}` } } },
            list: { options: { port: { type: (values: string[]) => values.map(Number), multiple: true } } },
        },
    },
    [commands, customValue]
);

result.values.timeout satisfies number;
if (result.command === 'number') {
    result.values.port satisfies number;
    // @ts-expect-error The inactive text converter cannot change this command's result type.
    result.values.port satisfies string;
}
if (result.command === 'text') result.values.port satisfies string | undefined;
if (result.command === 'list') result.values.port satisfies number[] | undefined;
