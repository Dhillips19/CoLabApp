module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],  // Updated path
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/__mocks__/styleMock.js',  // Updated path
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/__mocks__/fileMock.js'  // Updated path
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  testMatch: [
    "<rootDir>/tests/**/*.test.{js,jsx}"
  ],
  moduleDirectories: ["node_modules", "src"]
};