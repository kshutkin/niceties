/** @type {import('jest').Config} */
export default {
    testEnvironment: 'node',
    extensionsToTreatAsEsm: [],
    testMatch: ['<rootDir>/**/tests/**/*.spec.mjs'],
    testPathIgnorePatterns: ['/node_modules/'],
    coverageDirectory: './coverage',
    coveragePathIgnorePatterns: ['node_modules', 'src/tests'],
    transform: {},
};