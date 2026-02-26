const preset = require('../../config/jest-presets/jest/jest-preset')

module.exports = {
  ...preset,
  displayName: 'Uniswap Logic Tests',
  testEnvironment: 'node',
  setupFiles: [],
  setupFilesAfterEnv: [],
  globals: {
    'ts-jest': {
      diagnostics: false,
      isolatedModules: true,
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  transformIgnorePatterns: [],
  testMatch: ['<rootDir>/src/features/transactions/swap/services/tradeService/rpcIndicativeQuote.test.ts'],
}
