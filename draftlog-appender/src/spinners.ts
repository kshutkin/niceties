export interface Spinner {
	interval: number;
	frames: string[];
}

export const dots = {
    interval: 50,
    frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
};

export const line = {
    interval: 130,
    frames: ['-', '\\', '|', '/']
};
