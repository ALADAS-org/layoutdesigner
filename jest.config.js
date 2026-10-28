// Jest configuration — unit tests only (end-to-end tests run with Playwright).
// Layout follows Cryptocalc: tests/jest/unit, tests/jest/fixtures, tests/playwright/e2e.
//
// Main-process code is CJS (tests: *.test.js). Renderer code is ESM (tests: *.test.mjs);
// Jest runs it natively — no transform — with Node's --experimental-vm-modules flag,
// passed by the "test:jest" npm script.
'use strict';

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/jest'],
  testMatch: ['**/*.test.js', '**/*.test.mjs'],
  moduleFileExtensions: ['js', 'mjs', 'json'],
  transform: {}
};
