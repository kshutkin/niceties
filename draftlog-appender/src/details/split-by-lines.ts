
export default function splitByLines(message: string): string[] {
    return message
        .match(getSubstringsRegex()) ?? [];
}

let substringsRegex: RegExp, substringsColumns: number;

function getSubstringsRegex() {
    const newColumns = process.stdout.columns;
    if (substringsColumns !== newColumns) {
        substringsRegex = new RegExp(`.{1,${newColumns}}`, 'g');
        substringsColumns = newColumns;
    }
    return substringsRegex;
}
