module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/types/**/*.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  moduleNameMapping: {
    '^@shared/(.*)$': '<rootDir>/../shared/$1',
    '^@academics/(.*)$': '<rootDir>/../academics/src/$1',
    '^@finance/(.*)$': '<rootDir>/../finance/src/$1',
    '^@health/(.*)$': '<rootDir>/../health/src/$1',
    '^@government/(.*)$': '<rootDir>/../government/src/$1',
    '^@social/(.*)$': '<rootDir>/../social/src/$1'
  },
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/globalTeardown.ts'
};