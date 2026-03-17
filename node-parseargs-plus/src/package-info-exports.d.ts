/**
 * Walks up from the given URL (typically `import.meta.url`) to find
 * the nearest `package.json` and returns its `name`, `version`, and
 * `description` fields.
 *
 * @param fromUrl - The URL to start searching from (e.g. `import.meta.url`).
 * @returns An object with `name`, `version`, and `description` extracted from
 *   the nearest `package.json`. If no `package.json` is found or a field is
 *   missing, `name` defaults to `''`, `version` to `'<unknown>'`, and
 *   `description` to `''`.
 *
 * @example
 * ```ts
 * import { readPackageJson } from '@niceties/node-parseargs-plus/package-info';
 *
 * const pkg = await readPackageJson(import.meta.url);
 *
 * const { values } = parseArgsPlus({
 *     name: pkg.name,
 *     version: pkg.version,
 *     description: pkg.description,
 *     options: { ... },
 * }, [help]);
 * ```
 */
export declare function readPackageJson(fromUrl: string | URL): Promise<{
    name: string;
    version: string;
    description: string;
}>;
