/**
 * Dispatch module configuration
 * Constants for module ID, namespaces, and shared configuration
 */

/** Module ID for Dispatch */
export const MODULE_ID = "dispatch";

/** Module ID for Masks (parent module) */
export const MASKS_MODULE_ID = "masks-newgeneration-unofficial";

/** Socket namespace for cross-client communication */
export const SOCKET_NS = `module.${MODULE_ID}`;

/** Flag namespace for Dispatch-specific actor/document flags */
export const FLAG_NS = MODULE_ID;

/** Base path for module assets - 'dist/' prefix only needed in dev mode */
const BASE_PATH = import.meta.env?.DEV
	? `modules/${MODULE_ID}/dist`
	: `modules/${MODULE_ID}`;

/** Template paths */
export const TEMPLATES = {
	turnCards: `${BASE_PATH}/templates/turncards.hbs`,
	callSheet: `${BASE_PATH}/templates/sheets/call-sheet.hbs`,
} as const;

/** Settings keys */
export const SETTINGS = {
	maxCooldown: "maxCooldown",
	showCallsInTracker: "showCallsInTracker",
} as const;

/**
 * Get a localized string for this module
 * @param key - The localization key (without module prefix)
 */
export function localize(key: string): string {
	return game.i18n?.localize(`DISPATCH.${key}`) ?? key;
}

/**
 * Format a localized string with data
 * @param key - The localization key (without module prefix)
 * @param data - Data to interpolate
 */
export function format(key: string, data: Record<string, unknown>): string {
	return game.i18n?.format(`DISPATCH.${key}`, data) ?? key;
}
