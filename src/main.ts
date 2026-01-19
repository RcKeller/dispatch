/**
 * Dispatch - Combat UI for Masks: A New Generation
 *
 * This module provides:
 * - Turn Cards HUD (bottom of screen during combat)
 * - Call Sheets ("Calls" actor type)
 * - Labels Graph Overlay (3-polygon comparison)
 * - Resource Trackers (playbook-specific)
 *
 * Requires: masks-newgeneration-unofficial
 */

// Import styles
import "./styles/dispatch.scss";

// Import module components
import { MODULE_ID, MASKS_MODULE_ID } from "./config";
import { registerTurnCards, cleanupTurnCards } from "./module/turn-cards";
import { registerCallSheet } from "./module/call-sheet";

/**
 * Initialization hook - register settings and sheets
 */
Hooks.once("init", () => {
	console.log(`${MODULE_ID} | Initializing Dispatch: Combat UI for Masks`);

	// Register module settings
	registerSettings();

	// Register the Call sheet
	registerCallSheet();
});

/**
 * Ready hook - wait for masks module and initialize components
 */
Hooks.once("ready", () => {
	// Verify masks module is active
	const masksModule = game.modules?.get(MASKS_MODULE_ID);
	if (!masksModule?.active) {
		ui.notifications?.error(
			`Dispatch requires "${MASKS_MODULE_ID}" to be installed and active.`
		);
		return;
	}

	console.log(`${MODULE_ID} | Dispatch ready - masks module verified`);

	// Initialize turn cards
	registerTurnCards();
});

/**
 * Cleanup on module disable/hot reload
 */
Hooks.once("closeSettings", () => {
	cleanupTurnCards();
});

/**
 * Register module settings
 */
function registerSettings() {
	// Max cooldown turns setting
	game.settings?.register(MODULE_ID, "maxCooldown", {
		name: "DISPATCH.Settings.MaxCooldown.Name",
		hint: "DISPATCH.Settings.MaxCooldown.Hint",
		scope: "world",
		config: true,
		type: Number,
		default: 2,
		range: {
			min: 1,
			max: 5,
			step: 1,
		},
	});

	// Show calls in combat tracker
	game.settings?.register(MODULE_ID, "showCallsInTracker", {
		name: "DISPATCH.Settings.ShowCallsInTracker.Name",
		hint: "DISPATCH.Settings.ShowCallsInTracker.Hint",
		scope: "world",
		config: true,
		type: Boolean,
		default: true,
	});
}

// Export for external access
export { MODULE_ID, MASKS_MODULE_ID };
