// jest.config.js for backend tests
export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/backend/**/*.test.js'],
  rootDir: '.',
  roots: ['<rootDir>', '../tests/backend'],
  moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
  modulePaths: ['<rootDir>/node_modules'],
  transform: {},
};
