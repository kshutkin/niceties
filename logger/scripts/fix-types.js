import { readFileSync, writeFileSync } from 'node:fs';

const file = 'types/index.d.ts';
const content = readFileSync(file, 'utf8');

const fixed = content.replace(
    /(export )?type DefaultExtendedApi = \{([^}]*)\};/g,
    (_, exp, body) => `${exp ?? ''}interface DefaultExtendedApi {${body}}`
);

writeFileSync(file, fixed);
