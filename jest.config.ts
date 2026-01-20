import type { Config } from "jest";

const config: Config = {
	preset: "ts-jest",
	testEnvironment: "node",
	testMatch: ["**/test/**/*.test.ts"],

	// Transform TypeScript files
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				tsconfig: {
					module: "commonjs",
					moduleResolution: "node",
					esModuleInterop: true,
					allowSyntheticDefaultImports: true,
					strict: true,
					skipLibCheck: true,
					noEmit: true,
					isolatedModules: true,
				},
			},
		],
	},

	// Mock import.meta for Vite compatibility
	globals: {
		"import.meta": {
			env: {
				DEV: false,
				PROD: true,
				MODE: "test",
			},
		},
	},

	// Setup files run after Jest environment is set up
	setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],

	// Module path aliases and mocks
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
		"^@test/(.*)$": "<rootDir>/test/$1",
		// Mock the config module to avoid import.meta issues
		"^\\.\\./config$": "<rootDir>/test/__mocks__/config.ts",
		"^\\.\\./(.*)/config$": "<rootDir>/test/__mocks__/config.ts",
	},

	// Files to collect coverage from
	collectCoverageFrom: [
		"src/module/**/*.ts",
		"!src/**/*.d.ts",
	],

	// Coverage thresholds - start lower, increase over time
	coverageThreshold: {
		global: {
			branches: 20,
			functions: 20,
			lines: 20,
			statements: 20,
		},
	},

	// Coverage reporters
	coverageReporters: ["text", "text-summary", "lcov"],

	// Ignore patterns
	testPathIgnorePatterns: ["/node_modules/", "/dist/"],
	modulePathIgnorePatterns: ["/dist/"],

	// Clear mocks between tests
	clearMocks: true,
	restoreMocks: true,

	// Verbose output for debugging
	verbose: true,
};

export default config;
