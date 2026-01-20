/**
 * Tests for turn-cards.ts
 * Turn Cards HUD - Combat UI for Masks
 */

import { createMockActor } from "../__mocks__/foundry";
import { StubActor } from "../stubs/foundry/StubActor";
import {
	BEACON,
	SOLDIER,
	ALL_MAX_LABELS,
} from "../test_data/TestCharacters";

describe("turn-cards", () => {
	// Module exports
	let getActiveCombat: () => unknown | null;
	let isDowned: (combatant: unknown) => boolean;
	let getTeamCombatants: (combat: unknown) => unknown[];
	let CooldownSystem: {
		maxCooldown: (teamSize: number) => number;
		remaining: (cbt: unknown, maxCd: number) => number;
		fraction: (rem: number, maxCd: number) => number;
		isOnCooldown: (cbt: unknown, maxCd: number) => boolean;
	};
	let promptShiftLabels: (actor: unknown, title?: string) => Promise<{ up: string; down: string } | null>;
	let applyShiftLabels: (
		actor: unknown,
		upKey: string,
		downKey: string,
		options?: { announce?: boolean; reason?: string; sourceActor?: unknown }
	) => Promise<boolean>;

	beforeAll(async () => {
		const module = await import("../../src/module/turn-cards");
		getActiveCombat = module.getActiveCombat;
		isDowned = module.isDowned;
		getTeamCombatants = module.getTeamCombatants;
		CooldownSystem = module.CooldownSystem;
		promptShiftLabels = module.promptShiftLabels;
		applyShiftLabels = module.applyShiftLabels;
	});

	// ========================================================================
	// Combat Utilities
	// ========================================================================

	describe("getActiveCombat", () => {
		it("should return null when game.combats is undefined", () => {
			(globalThis as any).game = { combats: undefined };
			(globalThis as any).ui = { combat: undefined };

			const result = getActiveCombat();
			expect(result).toBeNull();
		});

		it("should return game.combats.active when available", () => {
			const activeCombat = { id: "combat-1", active: true };
			(globalThis as any).game = { combats: { active: activeCombat } };

			const result = getActiveCombat();
			expect(result).toBe(activeCombat);
		});

		it("should fall back to ui.combat.viewed when no active combat", () => {
			const viewedCombat = { id: "combat-2", viewed: true };
			(globalThis as any).game = { combats: { active: null } };
			(globalThis as any).ui = { combat: { viewed: viewedCombat } };

			const result = getActiveCombat();
			expect(result).toBe(viewedCombat);
		});

		it("should return null when both active and viewed are null", () => {
			(globalThis as any).game = { combats: { active: null } };
			(globalThis as any).ui = { combat: { viewed: null } };

			const result = getActiveCombat();
			expect(result).toBeNull();
		});
	});

	describe("isDowned", () => {
		it("should return true when combatant.defeated is true", () => {
			const combatant = { defeated: true, actor: { system: { attributes: { hp: { value: 5 } } } } };
			expect(isDowned(combatant)).toBe(true);
		});

		it("should return true when HP is 0", () => {
			const combatant = { defeated: false, actor: { system: { attributes: { hp: { value: 0 } } } } };
			expect(isDowned(combatant)).toBe(true);
		});

		it("should return true when HP is negative", () => {
			const combatant = { defeated: false, actor: { system: { attributes: { hp: { value: -2 } } } } };
			expect(isDowned(combatant)).toBe(true);
		});

		it("should return false when HP > 0 and not defeated", () => {
			const combatant = { defeated: false, actor: { system: { attributes: { hp: { value: 3 } } } } };
			expect(isDowned(combatant)).toBe(false);
		});

		it("should handle missing combatant (return false)", () => {
			expect(isDowned(null)).toBe(false);
			expect(isDowned(undefined)).toBe(false);
		});

		it("should handle missing actor (return false)", () => {
			const combatant = { defeated: false, actor: null };
			expect(isDowned(combatant)).toBe(false);
		});

		it("should handle missing HP attribute", () => {
			const combatant = { defeated: false, actor: { system: { attributes: {} } } };
			expect(isDowned(combatant)).toBe(false);
		});

		it("should handle non-numeric HP", () => {
			const combatant = { defeated: false, actor: { system: { attributes: { hp: { value: "full" } } } } };
			expect(isDowned(combatant)).toBe(false);
		});

		it("should prioritize defeated flag over HP", () => {
			const combatant = { defeated: true, actor: { system: { attributes: { hp: { value: 10 } } } } };
			expect(isDowned(combatant)).toBe(true);
		});
	});

	describe("getTeamCombatants", () => {
		it("should return empty array for null combat", () => {
			const result = getTeamCombatants(null);
			expect(result).toEqual([]);
		});

		it("should return empty array for combat with no combatants", () => {
			const combat = { combatants: { contents: [] } };
			const result = getTeamCombatants(combat);
			expect(result).toEqual([]);
		});

		it("should filter to character type only", () => {
			const combat = {
				combatants: {
					contents: [
						{ id: "c1", actor: { id: "a1", type: "character" } },
						{ id: "c2", actor: { id: "a2", type: "npc" } },
						{ id: "c3", actor: { id: "a3", type: "character" } },
					],
				},
			};
			const result = getTeamCombatants(combat);
			expect(result).toHaveLength(2);
			expect(result.map((c: any) => c.id)).toEqual(["c1", "c3"]);
		});

		it("should remove duplicate actors (same actor with multiple tokens)", () => {
			const combat = {
				combatants: {
					contents: [
						{ id: "c1", actor: { id: "a1", type: "character" } },
						{ id: "c2", actor: { id: "a1", type: "character" } }, // Same actor
						{ id: "c3", actor: { id: "a2", type: "character" } },
					],
				},
			};
			const result = getTeamCombatants(combat);
			expect(result).toHaveLength(2);
			// Should keep first occurrence
			expect(result.map((c: any) => c.id)).toEqual(["c1", "c3"]);
		});

		it("should handle NPCs in combat (exclude them)", () => {
			const combat = {
				combatants: {
					contents: [
						{ id: "c1", actor: { id: "a1", type: "npc" } },
						{ id: "c2", actor: { id: "a2", type: "npc" } },
					],
				},
			};
			const result = getTeamCombatants(combat);
			expect(result).toEqual([]);
		});

		it("should handle combatants without actors", () => {
			const combat = {
				combatants: {
					contents: [
						{ id: "c1", actor: null },
						{ id: "c2", actor: { id: "a1", type: "character" } },
					],
				},
			};
			const result = getTeamCombatants(combat);
			expect(result).toHaveLength(1);
			expect((result[0] as any).id).toBe("c2");
		});
	});

	// ========================================================================
	// Cooldown System
	// ========================================================================

	describe("CooldownSystem", () => {
		describe("maxCooldown", () => {
			it("should return 0 for team size 1", () => {
				expect(CooldownSystem.maxCooldown(1)).toBe(0);
			});

			it("should return 1 for team size 2", () => {
				expect(CooldownSystem.maxCooldown(2)).toBe(1);
			});

			it("should return 2 for team size 3", () => {
				expect(CooldownSystem.maxCooldown(3)).toBe(2);
			});

			it("should return 3 for team size 4", () => {
				expect(CooldownSystem.maxCooldown(4)).toBe(3);
			});

			it("should return 4 for team size 5", () => {
				expect(CooldownSystem.maxCooldown(5)).toBe(4);
			});

			it("should return 0 for team size 0", () => {
				expect(CooldownSystem.maxCooldown(0)).toBe(0);
			});

			it("should return 0 for negative team size", () => {
				expect(CooldownSystem.maxCooldown(-1)).toBe(0);
			});

			it("should handle NaN/undefined as 0", () => {
				expect(CooldownSystem.maxCooldown(NaN)).toBe(0);
				expect(CooldownSystem.maxCooldown(undefined as any)).toBe(0);
			});
		});

		describe("remaining", () => {
			function createCombatantWithCooldown(cooldownValue: number | undefined) {
				return {
					getFlag: (_ns: string, key: string) => {
						if (key === "turnCardsCooldownRemaining") return cooldownValue;
						return undefined;
					},
				};
			}

			it("should return correct remaining turns when within cooldown window", () => {
				const cbt = createCombatantWithCooldown(2);
				expect(CooldownSystem.remaining(cbt, 3)).toBe(2);
			});

			it("should return 0 when cooldown expired (flag is 0)", () => {
				const cbt = createCombatantWithCooldown(0);
				expect(CooldownSystem.remaining(cbt, 3)).toBe(0);
			});

			it("should return 0 when never acted (no flag)", () => {
				const cbt = createCombatantWithCooldown(undefined);
				expect(CooldownSystem.remaining(cbt, 3)).toBe(0);
			});

			it("should cap remaining to maxCd", () => {
				const cbt = createCombatantWithCooldown(10);
				expect(CooldownSystem.remaining(cbt, 3)).toBe(3);
			});

			it("should return 0 when maxCd is 0", () => {
				const cbt = createCombatantWithCooldown(2);
				expect(CooldownSystem.remaining(cbt, 0)).toBe(0);
			});

			it("should handle missing combatant", () => {
				expect(CooldownSystem.remaining(null, 3)).toBe(0);
				expect(CooldownSystem.remaining(undefined, 3)).toBe(0);
			});

			it("should handle negative flag values (treat as 0)", () => {
				const cbt = createCombatantWithCooldown(-1);
				expect(CooldownSystem.remaining(cbt, 3)).toBe(0);
			});
		});

		describe("fraction", () => {
			it("should return 0 when maxCd is 0", () => {
				expect(CooldownSystem.fraction(2, 0)).toBe(0);
			});

			it("should return 0 when remaining is 0", () => {
				expect(CooldownSystem.fraction(0, 3)).toBe(0);
			});

			it("should return 0.5 when remaining is half of maxCd", () => {
				expect(CooldownSystem.fraction(2, 4)).toBe(0.5);
			});

			it("should return 1 when remaining equals maxCd", () => {
				expect(CooldownSystem.fraction(3, 3)).toBe(1);
			});

			it("should clamp to maximum of 1", () => {
				expect(CooldownSystem.fraction(5, 3)).toBe(1);
			});

			it("should clamp to minimum of 0", () => {
				expect(CooldownSystem.fraction(-1, 3)).toBe(0);
			});

			it("should handle decimal values", () => {
				expect(CooldownSystem.fraction(1.5, 3)).toBe(0.5);
			});
		});

		describe("isOnCooldown", () => {
			function createCombatantWithCooldown(cooldownValue: number | undefined) {
				return {
					getFlag: (_ns: string, key: string) => {
						if (key === "turnCardsCooldownRemaining") return cooldownValue;
						return undefined;
					},
				};
			}

			it("should return true when remaining > 0", () => {
				const cbt = createCombatantWithCooldown(2);
				expect(CooldownSystem.isOnCooldown(cbt, 3)).toBe(true);
			});

			it("should return false when remaining is 0", () => {
				const cbt = createCombatantWithCooldown(0);
				expect(CooldownSystem.isOnCooldown(cbt, 3)).toBe(false);
			});

			it("should return false when never acted", () => {
				const cbt = createCombatantWithCooldown(undefined);
				expect(CooldownSystem.isOnCooldown(cbt, 3)).toBe(false);
			});

			it("should return false when maxCd is 0", () => {
				const cbt = createCombatantWithCooldown(2);
				expect(CooldownSystem.isOnCooldown(cbt, 0)).toBe(false);
			});
		});
	});

	// ========================================================================
	// Label Shift Functions
	// ========================================================================

	describe("applyShiftLabels", () => {
		function createActorForShift() {
			const actor = createMockActor();
			(actor.system.stats as any) = {
				danger: { value: 0, label: "Danger" },
				freak: { value: 0, label: "Freak" },
				savior: { value: 0, label: "Savior" },
				superior: { value: 0, label: "Superior" },
				mundane: { value: 0, label: "Mundane" },
			};
			const updateCalls: Record<string, unknown>[] = [];
			(actor as any).update = jest.fn(async (data: Record<string, unknown>) => {
				updateCalls.push(data);
				// Apply updates
				for (const [path, value] of Object.entries(data)) {
					const parts = path.split(".");
					let current: any = actor;
					for (let i = 0; i < parts.length - 1; i++) {
						current = current[parts[i]];
					}
					current[parts[parts.length - 1]] = value;
				}
			});
			(actor as any).updateCalls = updateCalls;
			return actor;
		}

		it("should shift one label up and one down", async () => {
			const actor = createActorForShift();
			(actor.system.stats as any).danger.value = 0;
			(actor.system.stats as any).freak.value = 0;

			const result = await applyShiftLabels(actor, "danger", "freak", { announce: false });

			expect(result).toBe(true);
			expect((actor as any).updateCalls).toHaveLength(1);
			expect((actor as any).updateCalls[0]["system.stats.danger.value"]).toBe(1);
			expect((actor as any).updateCalls[0]["system.stats.freak.value"]).toBe(-1);
		});

		it("should return false when up label already at max", async () => {
			const actor = createActorForShift();
			(actor.system.stats as any).danger.value = 3; // At max
			(actor.system.stats as any).freak.value = 0;

			const result = await applyShiftLabels(actor, "danger", "freak", { announce: false });

			expect(result).toBe(false);
		});

		it("should return false when down label already at min", async () => {
			const actor = createActorForShift();
			(actor.system.stats as any).danger.value = 0;
			(actor.system.stats as any).freak.value = -2; // At min

			const result = await applyShiftLabels(actor, "danger", "freak", { announce: false });

			expect(result).toBe(false);
		});

		it("should handle soldier label", async () => {
			const actor = createActorForShift();
			(actor.system.stats as any).danger.value = 0;
			// Add soldier attribute
			(actor.system.attributes as any).theSoldier = { value: 0 };

			const result = await applyShiftLabels(actor, "danger", "soldier", { announce: false });

			expect(result).toBe(true);
			expect((actor as any).updateCalls[0]["system.stats.danger.value"]).toBe(1);
			expect((actor as any).updateCalls[0]["system.attributes.theSoldier.value"]).toBe(-1);
		});
	});

	// ========================================================================
	// Helper Functions
	// ========================================================================

	describe("clampInt (via remaining behavior)", () => {
		// Test clampInt indirectly through CooldownSystem.remaining

		it("should floor decimal values", () => {
			const cbt = {
				getFlag: () => 2.9,
			};
			// remaining floors the value
			const result = CooldownSystem.remaining(cbt, 5);
			expect(result).toBe(2);
		});

		it("should handle Infinity (treated as non-finite, returns 0)", () => {
			const cbt = {
				getFlag: () => Infinity,
			};
			// Infinity is not finite, so it's treated as 0
			const result = CooldownSystem.remaining(cbt, 3);
			expect(result).toBe(0);
		});

		it("should handle -Infinity", () => {
			const cbt = {
				getFlag: () => -Infinity,
			};
			// Should clamp to 0
			const result = CooldownSystem.remaining(cbt, 3);
			expect(result).toBe(0);
		});
	});

	// ========================================================================
	// Integration Tests
	// ========================================================================

	describe("Combat Flow Integration", () => {
		it("should correctly identify team in combat", () => {
			const combat = {
				combatants: {
					contents: [
						{ id: "hero1", actor: { id: "a1", type: "character", name: "Hero 1" } },
						{ id: "hero2", actor: { id: "a2", type: "character", name: "Hero 2" } },
						{ id: "villain", actor: { id: "a3", type: "npc", name: "Villain" } },
					],
				},
			};

			const team = getTeamCombatants(combat);
			const maxCd = CooldownSystem.maxCooldown(team.length);

			expect(team).toHaveLength(2);
			expect(maxCd).toBe(1); // team size 2 = maxCd 1
		});

		it("should track cooldown state correctly", () => {
			const combat = {
				combatants: {
					contents: [
						{ id: "h1", actor: { id: "a1", type: "character" } },
						{ id: "h2", actor: { id: "a2", type: "character" } },
						{ id: "h3", actor: { id: "a3", type: "character" } },
					],
				},
			};

			const team = getTeamCombatants(combat);
			const maxCd = CooldownSystem.maxCooldown(team.length); // 2

			// Simulate combatants with different cooldown states
			const combatantReady = { getFlag: () => 0 };
			const combatantOnCooldown = { getFlag: () => 1 };
			const combatantJustActed = { getFlag: () => 2 };

			expect(CooldownSystem.isOnCooldown(combatantReady, maxCd)).toBe(false);
			expect(CooldownSystem.isOnCooldown(combatantOnCooldown, maxCd)).toBe(true);
			expect(CooldownSystem.isOnCooldown(combatantJustActed, maxCd)).toBe(true);

			expect(CooldownSystem.remaining(combatantReady, maxCd)).toBe(0);
			expect(CooldownSystem.remaining(combatantOnCooldown, maxCd)).toBe(1);
			expect(CooldownSystem.remaining(combatantJustActed, maxCd)).toBe(2);
		});

		it("should calculate cooldown fractions for UI display", () => {
			const maxCd = 3;

			expect(CooldownSystem.fraction(0, maxCd)).toBe(0);
			expect(CooldownSystem.fraction(1, maxCd)).toBeCloseTo(0.333, 2);
			expect(CooldownSystem.fraction(2, maxCd)).toBeCloseTo(0.667, 2);
			expect(CooldownSystem.fraction(3, maxCd)).toBe(1);
		});
	});

	describe("Downed State Detection", () => {
		it("should detect various downed conditions", () => {
			const cases = [
				{ desc: "defeated flag", combatant: { defeated: true, actor: { system: { attributes: { hp: { value: 5 } } } } }, expected: true },
				{ desc: "HP at 0", combatant: { defeated: false, actor: { system: { attributes: { hp: { value: 0 } } } } }, expected: true },
				{ desc: "HP negative", combatant: { defeated: false, actor: { system: { attributes: { hp: { value: -1 } } } } }, expected: true },
				{ desc: "healthy", combatant: { defeated: false, actor: { system: { attributes: { hp: { value: 3 } } } } }, expected: false },
				{ desc: "no actor", combatant: { defeated: false, actor: null }, expected: false },
				{ desc: "null combatant", combatant: null, expected: false },
			];

			for (const { desc, combatant, expected } of cases) {
				expect(isDowned(combatant)).toBe(expected);
			}
		});
	});

	describe("Team Size Scaling", () => {
		const teamSizeTests = [
			{ size: 1, expectedMaxCd: 0, desc: "solo hero - no cooldown" },
			{ size: 2, expectedMaxCd: 1, desc: "duo - minimal cooldown" },
			{ size: 3, expectedMaxCd: 2, desc: "trio - moderate cooldown" },
			{ size: 4, expectedMaxCd: 3, desc: "quartet - standard cooldown" },
			{ size: 5, expectedMaxCd: 4, desc: "full party - full cooldown" },
			{ size: 6, expectedMaxCd: 5, desc: "large party - extended cooldown" },
		];

		for (const { size, expectedMaxCd, desc } of teamSizeTests) {
			it(`should handle ${desc} (size=${size})`, () => {
				expect(CooldownSystem.maxCooldown(size)).toBe(expectedMaxCd);
			});
		}
	});
});
