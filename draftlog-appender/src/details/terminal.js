/** @type {Set<WeakRef<() => void>>} */
const allColumnsListeners = new Set();

/**
 * Subscribe to terminal resize events
 * @param {() => void} listener
 */
export function subscribeToTerminalResize(listener) {
    allColumnsListeners.add(new WeakRef(listener));
}

process.stdout.on('resize', () => {
    for (const listener of allColumnsListeners) {
        const realListener = listener.deref();
        if (realListener) {
            realListener();
        } else {
            allColumnsListeners.delete(listener);
        }
    }
});