module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    testMatch: [
        '**/__tests__/**/*.ts',
        '**/__tests__/**/*.tsx',
        '**/?(*.)+(spec|test).ts',
        '**/?(*.)+(spec|test).tsx'
    ],
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^@/(.*)$': '<rootDir>/src/$1',
        'monaco-editor': '<rootDir>/src/mocks/monaco-editor.ts'
    },
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/index.ts',
        '!src/**/__tests__/**',
        '!src/**/*.test.{ts,tsx}',
        '!src/**/*.spec.{ts,tsx}'
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    globals: {
        'ts-jest': {
            tsconfig: {
                jsx: 'react',
                esModuleInterop: true,
                allowSyntheticDefaultImports: true
            }
        }
    }
};