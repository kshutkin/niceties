import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Walks up from the given URL (typically `import.meta.url`) to find
 * the nearest `package.json` and returns its parsed contents.
 *
 * @param {string | URL} fromUrl - The URL to start searching from (e.g. `import.meta.url`).
 * @returns {Promise<{ name?: string; version?: string; description?: string; [key: string]: unknown }>}
 *   The parsed package.json contents, or an empty object if none is found.
 *
 * @example
 * ```js
 * import { readPackageJson } from '@niceties/node-parseargs-plus/package-info';
 *
 * const pkg = await readPackageJson(import.meta.url);
 * // pkg.name, pkg.version, pkg.description, etc.
 * ```
 */
export async function readPackageJson(fromUrl) {
    let dir = dirname(fileURLToPath(fromUrl));
    while (true) {
        const candidate = join(dir, 'package.json');
        try {
            const content = await readFile(candidate, 'utf8');
            return JSON.parse(content);
        } catch (err) {
            // If the file doesn't exist, continue walking up
            if (err.code === 'ENOENT') {
                const parent = dirname(dir);
                if (parent === dir) {
                    // Reached filesystem root without finding package.json
                    return {};
                }
                dir = parent;
            } else {
                throw err;
            }
        }
    }
}
