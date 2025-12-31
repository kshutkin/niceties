export default Object.assign(
    /** @param {typeof console} console */
    (console) => {
        console.draft = () => () => {};
        return {
            addLineListener() {},
        };
    },
    {
        defaults: {
            canRewrite: true,
        },
    }
);