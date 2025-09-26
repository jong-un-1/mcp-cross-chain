/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',  // Use ESM preset
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],  // Treat TypeScript files as ESM
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: true,  // Enable ESM support in ts-jest
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Using projects to separate test types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['**/*.spec.ts', '**/*.test.ts'],
      testEnvironment: 'node',
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
          useESM: true,
        }]
      },
    },
    {
      displayName: 'e2e',
      testMatch: ['**/*.e2e-spec.ts'],
      testEnvironment: 'node',
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
          useESM: true,
        }]
      },
      testTimeout: 60000
    }
  ]
};