export function formatMessage(color: ((message: string) => string) | undefined, prefix: string, message: string): string {
    const text = `${prefix}${message}`;
    return color ? color(text) : text;
}