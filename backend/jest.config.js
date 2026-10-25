export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  globalSetup: './tests/setup/globalSetup.js',
  globalTeardown: './tests/setup/globalTeardown.js',
  // Every test file builds its indexes on one shared in-memory MongoDB. With all files running in
  // parallel those beforeAll hooks queue up and could pass Jest's 5 s default, failing whole files
  // at random. 30 s fits the slow case while a genuinely hung hook still fails.
  testTimeout: 30_000,
};
