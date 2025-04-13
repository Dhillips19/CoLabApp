module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  verbose: true,
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  setupFilesAfterEnv: ['./jest.setup.js'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  }
};