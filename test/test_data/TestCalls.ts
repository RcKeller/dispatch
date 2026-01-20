/**
 * Pre-built test call requirements for dispatch tests
 *
 * These are constant call configurations for common test scenarios.
 *
 * Usage:
 *   import { CALL_DANGER_2, CALL_HIGH_REQUIREMENTS } from "../test_data/TestCalls";
 *
 *   it("should calculate fit correctly", () => {
 *     const fit = checkFitResult(heroLabels, CALL_DANGER_2.requirements);
 *     // ... test code
 *   });
 */

// ============================================================================
// Call Requirements
// ============================================================================

/**
 * Simple single-requirement call (Danger 2)
 * Use for basic fit calculation tests
 */
export const CALL_DANGER_2 = {
	requirements: { danger: 2 },
};

/**
 * Two requirements: Danger 1, Freak 1
 * Use for testing dual-requirement scenarios
 */
export const CALL_DANGER_1_FREAK_1 = {
	requirements: { danger: 1, freak: 1 },
};

/**
 * High requirements across multiple labels
 * Use for testing challenging calls
 */
export const CALL_HIGH_REQUIREMENTS = {
	requirements: { danger: 3, freak: 2, savior: 2 },
};

/**
 * No requirements (empty)
 * Should always result in "great" fit
 */
export const CALL_NO_REQUIREMENTS = {
	requirements: {},
};

/**
 * Savior-focused call (typical rescue mission)
 * Favors characters like The Legacy
 */
export const CALL_RESCUE = {
	requirements: { savior: 2, mundane: 1 },
};

/**
 * Investigation call
 * Favors high Superior characters
 */
export const CALL_INVESTIGATION = {
	requirements: { superior: 2, freak: 1 },
};

/**
 * Social call
 * Favors high Mundane characters
 */
export const CALL_SOCIAL = {
	requirements: { mundane: 2, superior: 1 },
};

/**
 * Assault call
 * Favors high Danger characters like The Bull
 */
export const CALL_ASSAULT = {
	requirements: { danger: 2, freak: 1 },
};

// ============================================================================
// Hero Label Sets for Fit Testing
// ============================================================================

/**
 * The Beacon's starting labels
 */
export const HERO_LABELS_BEACON = {
	danger: 2,
	freak: 0,
	savior: 1,
	superior: -1,
	mundane: 1,
};

/**
 * The Legacy's starting labels
 */
export const HERO_LABELS_LEGACY = {
	danger: -1,
	freak: 0,
	savior: 2,
	superior: 1,
	mundane: 1,
};

/**
 * The Bull's starting labels
 */
export const HERO_LABELS_BULL = {
	danger: 2,
	freak: 1,
	savior: -1,
	superior: -1,
	mundane: 2,
};

/**
 * The Nova's starting labels
 */
export const HERO_LABELS_NOVA = {
	danger: 1,
	freak: 2,
	savior: 0,
	superior: 1,
	mundane: -1,
};

/**
 * All labels at maximum (+3)
 * Should always be "great" fit
 */
export const HERO_LABELS_ALL_MAX = {
	danger: 3,
	freak: 3,
	savior: 3,
	superior: 3,
	mundane: 3,
};

/**
 * All labels at minimum (-2)
 * Should often be "poor" fit
 */
export const HERO_LABELS_ALL_MIN = {
	danger: -2,
	freak: -2,
	savior: -2,
	superior: -2,
	mundane: -2,
};

/**
 * Neutral labels (all 0)
 */
export const HERO_LABELS_NEUTRAL = {
	danger: 0,
	freak: 0,
	savior: 0,
	superior: 0,
	mundane: 0,
};

// ============================================================================
// Fit Test Scenarios
// ============================================================================

/**
 * Pre-computed fit scenarios for quick testing
 */
export const FIT_SCENARIOS = {
	/** Beacon vs Assault call - should be great fit */
	beaconAssault: {
		hero: HERO_LABELS_BEACON,
		call: CALL_ASSAULT,
		expectedFit: "great" as const,
	},
	/** Legacy vs Rescue call - should be great fit */
	legacyRescue: {
		hero: HERO_LABELS_LEGACY,
		call: CALL_RESCUE,
		expectedFit: "great" as const,
	},
	/** Bull vs Investigation call - should be poor fit */
	bullInvestigation: {
		hero: HERO_LABELS_BULL,
		call: CALL_INVESTIGATION,
		expectedFit: "poor" as const,
	},
	/** Nova vs Social call - should be poor fit */
	novaSocial: {
		hero: HERO_LABELS_NOVA,
		call: CALL_SOCIAL,
		expectedFit: "poor" as const,
	},
	/** Any hero vs no requirements - should be great fit */
	anyHeroNoReq: {
		hero: HERO_LABELS_NEUTRAL,
		call: CALL_NO_REQUIREMENTS,
		expectedFit: "great" as const,
	},
	/** Min labels vs high requirements - should be poor fit */
	minLabelsHighReq: {
		hero: HERO_LABELS_ALL_MIN,
		call: CALL_HIGH_REQUIREMENTS,
		expectedFit: "poor" as const,
	},
	/** Max labels vs high requirements - should be great fit */
	maxLabelsHighReq: {
		hero: HERO_LABELS_ALL_MAX,
		call: CALL_HIGH_REQUIREMENTS,
		expectedFit: "great" as const,
	},
};
