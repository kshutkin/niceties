import { parseArgsPlus } from '@niceties/node-parseargs-plus';
import { commands } from '@niceties/node-parseargs-plus/commands';
import { parameters } from '@niceties/node-parseargs-plus/parameters';

const result = parseArgsPlus(
    {
        args: ['--port', '3000', 'index.js'],
        defaultCommand: 'serve',
        options: { verbose: { type: 'boolean' } },
        commands: {
            serve: { options: { port: { type: 'string', short: 'p', default: '8080' } }, parameters: ['<file>'] },
            build: { options: { output: { type: 'string' } } },
        },
    },
    [commands, parameters]
);

if (result.command === 'serve') {
    result.values.port satisfies string;
    result.values.verbose satisfies boolean | undefined;
    result.parameters.file satisfies string;
    // @ts-expect-error Options from a different command are not available.
    result.values.output;
}
