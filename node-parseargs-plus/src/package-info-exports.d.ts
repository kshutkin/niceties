/**
 * Walks up from the given URL (typically `import.meta.url`) to find
 * the nearest `package.json` and returns its parsed contents.
 *
 * @param fromUrl - The URL to start searching from (e.g. `import.meta.url`).
 * @returns The parsed package.json contents, or an empty object if none is found.
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
    name?: string;
    version?: string;
    description?: string;
    [key: string]: unknown;
}>;
