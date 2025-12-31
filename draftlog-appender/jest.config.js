import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json').toString());
const scopeTest = /(@.+)\/.+$/g.exec(pkg.name);
let scope;
const moduleNameMapper = {};
if (scopeTest?.[0]) {
    scope = scopeTest[1];
    moduleNameMapper[`${scope}/(.*)/(.*)`] = '<rootDir>/../$1/src/$2.js';
    moduleNameMapper[`${scope}/(.*)$`] = '<rootDir>/../$1/src/index.js';
}

/** @type {import('jest').Config} */
export default {
    testEnvironment: 'node',
    extensionsToTreatAsEsm: [],
    testMatch: ['<rootDir>/**/tests/**/*.spec.mjs'],
    testPathIgnorePatterns: ['/node_modules/'],
    coverageDirectory: './coverage',
    coveragePathIgnorePatterns: ['node_modules', 'src/tests'],
    moduleNameMapper,
    transform: {},
};