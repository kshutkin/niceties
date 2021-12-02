export default Object.assign(
    jest.fn((console) => {
        console.draft = () => () => {}
        return {
            addLineListener() {}
        }
    }), {
        defaults: {
            canRewrite: true
        }
    }
);