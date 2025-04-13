module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setupTests.js'],  // Updated path
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__tests__/__mocks__/styleMock.js',  // Updated path
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__tests__/__mocks__/fileMock.js'  // Updated path
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  testMatch: [
    "<rootDir>/__tests__/**/*.test.{js,jsx}"
  ],
  moduleDirectories: ["node_modules", "src"]
};