/**
 * @type {{ draft: (text: string) => (text: string) => void }}
 */
const { draft } = await import(process.stdout.isTTY ? './tty.js' : './non-tty.js');

export { draft };
