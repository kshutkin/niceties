export default Object.assign(
    jest.fn((console) => {
        console.draft = () => () => {}
    }), {
        defaults: {
            canRewrite: true
        }
    }
);