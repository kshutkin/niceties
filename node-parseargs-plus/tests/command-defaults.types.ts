import { parseArgsPlus } from '@niceties/node-parseargs-plus';
import { commands } from '@niceties/node-parseargs-plus/commands';

const result = parseArgsPlus(
    {
        args: ['--config', 'prod.json', 'build'],
        options: {
            config: { type: 'string', default: 'dev.json' },
            color: { type: 'boolean', default: true },
            include: { type: 'string', multiple: true, default: ['src'] },
        },
        commands: { build: { options: { output: { type: 'string', default: 'dist' } } } },
    },
    [commands]
);

result.values.config satisfies string;
result.values.color satisfies boolean;
result.values.include satisfies string[];
if (result.command === 'build') {
    result.values.output satisfies string;
    // @ts-expect-error A defaulted string is not a boolean.
    result.values.config satisfies boolean;
}
// @ts-expect-error Internal parsing tokens must not become part of the public result.
result.tokens;
