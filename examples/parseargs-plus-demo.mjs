import { parseArgsPlus } from '@niceties/node-parseargs-plus';
import { commands } from '@niceties/node-parseargs-plus/commands';
import { help } from '@niceties/node-parseargs-plus/help';
import { parameters } from '@niceties/node-parseargs-plus/parameters';

const result = parseArgsPlus(
    {
        name: 'my-cli',
        version: '1.2.3',
        description:
            'A feature-rich command-line tool for greeting people in various ways. ' +
            'Supports multiple output formats, customizable repetition, and optional ' +
            'uppercase styling for extra emphasis when you really need to get your point across.',
        options: {
            output: {
                type: 'string',
                description:
                    'Path to an output file where the result will be written instead of stdout. ' +
                    'Parent directories will be created automatically if they do not already exist.',
            },
            loud: {
                type: 'boolean',
                description: 'Convert the entire output to uppercase for maximum visibility and dramatic effect.',
            },
        },
        commands: {
            greet: {
                description: 'Greet a person or entity with a friendly message.',
                parameters: ['<name>', '[extra-names...]'],
                options: {
                    count: {
                        type: 'string',
                        default: '1',
                        description:
                            'How many times to repeat the greeting. ' +
                            'Useful for testing output buffering or when you want to make absolutely sure the recipient gets the message.',
                    },
                    template: {
                        type: 'string',
                        short: 't',
                        default: 'Hello, {{name}}!',
                        description:
                            'A greeting template string. Use {{name}} as a placeholder for the name value. ' +
                            'Defaults to "Hello, {{name}}!" when not specified.',
                    },
                },
            },
            install: {
                description: 'Install one or more packages into the project.',
                parameters: ['<packages...>'],
                options: {
                    'save-dev': {
                        type: 'boolean',
                        short: 'D',
                        description: 'Save packages as dev dependencies instead of production dependencies.',
                    },
                },
            },
            stats: {
                description: 'Display statistics about previous greetings and overall usage.',
                options: {
                    format: {
                        type: 'string',
                        short: 'f',
                        default: 'table',
                        description: 'Output format for the statistics report. ' + 'Supported values are "table", "json", and "csv".',
                    },
                    since: {
                        type: 'string',
                        description:
                            'Only include greetings since this date (ISO 8601 format). ' + 'When omitted, all historical data is included.',
                    },
                },
            },
        },
        defaultCommand: 'greet',
    },
    [help, commands, parameters]
);

console.log(result);
