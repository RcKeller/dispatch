/**
 * Mock for dispatch config module
 * Avoids import.meta.env issues in Jest
 */

export const MODULE_ID = "dispatch";
export const MASKS_MODULE_ID = "masks-newgeneration-unofficial";
export const SOCKET_NS = "module.dispatch";
export const FLAG_NS = "dispatch";

export const TEMPLATES = {
	turnCards: "modules/dispatch/templates/turncards.hbs",
	callSheet: "modules/dispatch/templates/sheets/call-sheet.hbs",
} as const;

export const SETTINGS = {
	maxCooldown: "maxCooldown",
	showCallsInTracker: "showCallsInTracker",
} as const;

export function localize(key: string): string {
	return key;
}

export function format(key: string, _data: Record<string, unknown>): string {
	return key;
}
