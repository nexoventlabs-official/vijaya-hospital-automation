module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  testTimeout: 15000,
  collectCoverageFrom: [
    'services/**/*.js',
    'routes/**/*.js',
    '!services/googleSheets.js',
  ],
};
