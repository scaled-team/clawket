/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '..',
  testEnvironment: './e2e/environment',
  testRunner: 'jest-circus/runner',
  testTimeout: 120000,
  testRegex: ['e2e/.*\\.spec\\.ts$'],
  reporters: ['detox/runners/jest/reporter'],
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  setupFilesAfterEach: ['./e2e/setup.ts'],
  maxWorkers: 1,
  verbose: true,
};
