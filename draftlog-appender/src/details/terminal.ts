const allColumnsListeners = new Set<WeakRef<() => void>>();

export function subscribeToTerminalResize(listener: () => void) {
    allColumnsListeners.add(new WeakRef(listener));
}

process.stdout.on('resize', () => {
    for (const listener of allColumnsListeners) {
        const realListener = listener.deref();
        if (realListener) {
            realListener();
        }
    }
});