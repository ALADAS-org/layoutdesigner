// Jest configuration — unit tests only (end-to-end tests run with Playwright).
// Layout follows Cryptocalc: tests/jest/unit, tests/jest/fixtures, tests/playwright/e2e.
'use strict';

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/jest'],
  testMatch: ['**/*.test.js']
};
