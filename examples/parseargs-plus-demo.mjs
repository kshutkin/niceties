import { parseArgsPlus } from '@niceties/node-parseargs-plus';
import { help } from '@niceties/node-parseargs-plus/help';

const withHelp = parseArgsPlus(
    {
        name: 'my-cli',
        version: '1.2.3',
        description: 'Test CLI',
        options: {
            veryVeryLongNameOption: { type: 'string', default: 'world', description: 'Your name' },
            count: { type: 'string', default: '1', description: 'How many times to greet' },
            loud: { type: 'boolean', description: 'Use uppercase output' },
        },
    },
    [help]
);

console.log(withHelp);
