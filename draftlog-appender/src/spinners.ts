export interface Spinner {
	interval: number;
	frames: string[];
}

export type Spinners = { [key: string]: Spinner };

export const spinners: Spinners = {
    dots: {
        interval: 50,
        frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    },
    line: {
        interval: 130,
        frames: ['-', '\\', '|', '/']
    }
};