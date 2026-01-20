/**
 * Jest Setup File for Dispatch Module
 * Configures the test environment with FoundryVTT mocks
 */

import { setupFoundryMocks, cleanupFoundryMocks } from "./__mocks__/foundry";

// Mock Vite's import.meta.env
Object.defineProperty(globalThis, "import", {
	value: {
		meta: {
			env: {
				DEV: false,
				PROD: true,
				MODE: "test",
			},
		},
	},
	writable: true,
});

// Setup mocks before all tests
beforeAll(() => {
	setupFoundryMocks();
});

// Reset mocks before each test
beforeEach(() => {
	setupFoundryMocks();
});

// Cleanup after all tests
afterAll(() => {
	cleanupFoundryMocks();
});
