/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    testMatch: ['<rootDir>/**/tests/**/*.spec.ts'],
    globals: {
        'ts-jest': {
            useESM: true,
        },
    },
    testPathIgnorePatterns: ['/node_modules/'],
    coverageDirectory: './coverage',
    coveragePathIgnorePatterns: ['node_modules', 'src/tests'],
    moduleNameMapper: {
        '@niceties/(.*)/(.*)': '<rootDir>/../$1/src/$2.ts',
        '@niceties/(.*)$': '<rootDir>/../$1/src',
    },
};