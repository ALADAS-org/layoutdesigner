// Playwright configuration — end-to-end tests of the Electron app.
'use strict';

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  workers: 1,
  reporter: 'list',
  outputDir: './test-results'
});
