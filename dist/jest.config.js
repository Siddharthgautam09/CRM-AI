"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    collectCoverageFrom: ['**/*.ts', '!dist/**', '!**/*.d.ts', '!**/index.ts'],
    coverageDirectory: 'coverage',
    clearMocks: true,
    setupFiles: ['<rootDir>/tests/setup-env.ts'],
};
exports.default = config;
