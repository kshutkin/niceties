import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Walks up from the given URL (typically `import.meta.url`) to find
 * the nearest `package.json` and returns its `name`, `version`, and
 * `description` fields.
 *
 * @param {string | URL} fromUrl - The URL to start searching from (e.g. `import.meta.url`).
 * @returns {Promise<{ name: string; version: string; description: string }>}
 *   An object with `name`, `version`, and `description` extracted from the
 *   nearest `package.json`. If no `package.json` is found or a field is
 *   missing, `name` defaults to `''`, `version` to `'<unknown>'`, and
 *   `description` to `''`.
 *
 * @example
 * ```js
 * import { readPackageJson } from '@niceties/node-parseargs-plus/package-info';
 *
 * const pkg = await readPackageJson(import.meta.url);
 * // pkg.name, pkg.version, pkg.description
 * ```
 */
export async function readPackageJson(fromUrl) {
    /** @type {{ name?: unknown; version?: unknown; description?: unknown } | undefined} */
    let pkg;
    let dir = dirname(fileURLToPath(fromUrl));
    while (true) {
        const candidate = join(dir, 'package.json');
        try {
            const content = await readFile(candidate, 'utf8');
            pkg = JSON.parse(content);
            break;
        } catch (err) {
            // If the file doesn't exist, continue walking up
            if (typeof err === 'object' && err !== null && /** @type {any} */ (err).code === 'ENOENT') {
                const parent = dirname(dir);
                if (parent === dir) {
                    // Reached filesystem root without finding package.json
                    break;
                }
                dir = parent;
            } else {
                // For any other error (permission denied, JSON parse error, etc.)
                // fall through and return defaults
                break;
            }
        }
    }
    return {
        name: typeof pkg?.name === 'string' ? pkg.name : '',
        version: typeof pkg?.version === 'string' ? pkg.version : '<unknown>',
        description: typeof pkg?.description === 'string' ? pkg.description : '',
    };
}
