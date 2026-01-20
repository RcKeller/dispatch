/**
 * Tests for resource-trackers.ts
 * Playbook-specific resource tracker configurations and helpers
 */

import { createMockActor } from "../__mocks__/foundry";
import { StubActor } from "../stubs/foundry/StubActor";
import {
	BEACON,
	NOVA,
	BULL,
	DOOMED,
	SOLDIER,
	LEGACY,
	NOMAD,
	REFORMED,
	HARBINGER,
} from "../test_data/TestCharacters";

describe("resource-trackers", () => {
	let TrackerType: Record<string, string>;
	let PLAYBOOK_TRACKERS: Record<string, unknown>;
	let getPlaybookName: (actor: unknown) => string;
	let getPlaybookTrackers: (actor: unknown) => { left: unknown[]; right: unknown[] };
	let getTrackerValue: (actor: unknown, tracker: unknown) => number;
	let getTrackerMax: (tracker: unknown, actor?: unknown) => number;
	let buildTrackerData: (
		actor: unknown,
		tracker: unknown,
		options: { isGM: boolean; isSelf: boolean }
	) => unknown;
	let getTrackerDataForActor: (
		actor: unknown,
		options: { isGM: boolean; isSelf: boolean }
	) => { leftTop: unknown[]; leftBeside: unknown[]; rightTop: unknown[] };
	let changeTrackerValue: (actor: unknown, trackerId: string, delta: number) => Promise<boolean>;

	beforeAll(async () => {
		const module = await import("../../src/module/resource-trackers");
		TrackerType = module.TrackerType;
		PLAYBOOK_TRACKERS = module.PLAYBOOK_TRACKERS;
		getPlaybookName = module.getPlaybookName;
		getPlaybookTrackers = module.getPlaybookTrackers;
		getTrackerValue = module.getTrackerValue;
		getTrackerMax = module.getTrackerMax;
		buildTrackerData = module.buildTrackerData;
		getTrackerDataForActor = module.getTrackerDataForActor;
		changeTrackerValue = module.changeTrackerValue;
	});

	describe("TrackerType", () => {
		it("should have NUMERIC type", () => {
			expect(TrackerType.NUMERIC).toBe("numeric");
		});

		it("should have ACTION type", () => {
			expect(TrackerType.ACTION).toBe("action");
		});

		it("should have DISPLAY type", () => {
			expect(TrackerType.DISPLAY).toBe("display");
		});

		it("should have BULL_HEART type", () => {
			expect(TrackerType.BULL_HEART).toBe("bull_heart");
		});

		it("should have CHECKLIST type", () => {
			expect(TrackerType.CHECKLIST).toBe("checklist");
		});

		it("should have DOOM_TRACK type", () => {
			expect(TrackerType.DOOM_TRACK).toBe("doom_track");
		});

		it("should have INFLUENCE_CHECKLIST type", () => {
			expect(TrackerType.INFLUENCE_CHECKLIST).toBe("influence_checklist");
		});

		it("should be frozen", () => {
			expect(Object.isFrozen(TrackerType)).toBe(true);
		});
	});

	describe("PLAYBOOK_TRACKERS", () => {
		it("should have The Doomed configuration", () => {
			expect(PLAYBOOK_TRACKERS["The Doomed"]).toBeDefined();
			const config = PLAYBOOK_TRACKERS["The Doomed"] as { right: unknown[] };
			expect(config.right).toHaveLength(1);
		});

		it("should have The Bull configuration", () => {
			expect(PLAYBOOK_TRACKERS["The Bull"]).toBeDefined();
			const config = PLAYBOOK_TRACKERS["The Bull"] as { left: unknown[] };
			expect(config.left).toHaveLength(1);
		});

		it("should have The Nova configuration", () => {
			expect(PLAYBOOK_TRACKERS["The Nova"]).toBeDefined();
			const config = PLAYBOOK_TRACKERS["The Nova"] as { right: unknown[] };
			expect(config.right).toHaveLength(1);
		});

		it("should have null for playbooks without trackers", () => {
			expect(PLAYBOOK_TRACKERS["The Delinquent"]).toBeNull();
			expect(PLAYBOOK_TRACKERS["The Outsider"]).toBeNull();
			expect(PLAYBOOK_TRACKERS["The Transformed"]).toBeNull();
		});

		it("should be frozen", () => {
			expect(Object.isFrozen(PLAYBOOK_TRACKERS)).toBe(true);
		});
	});

	describe("getPlaybookName", () => {
		it("should return playbook name from actor", () => {
			const actor = createMockActor();
			(actor.system.playbook as { name: string }).name = "The Nova";
			expect(getPlaybookName(actor)).toBe("The Nova");
		});

		it("should return empty string for actor without playbook", () => {
			const actor = createMockActor();
			expect(getPlaybookName(actor)).toBe("");
		});

		it("should return empty string for null actor", () => {
			expect(getPlaybookName(null)).toBe("");
		});

		it("should return empty string for undefined actor", () => {
			expect(getPlaybookName(undefined)).toBe("");
		});
	});

	describe("getPlaybookTrackers", () => {
		it("should return trackers for playbook with config", () => {
			const actor = createMockActor();
			(actor.system.playbook as { name: string }).name = "The Nova";

			const { left, right } = getPlaybookTrackers(actor);
			expect(left).toEqual([]);
			expect(right).toHaveLength(1);
		});

		it("should return empty arrays for playbook without config", () => {
			const actor = createMockActor();
			(actor.system.playbook as { name: string }).name = "The Delinquent";

			const { left, right } = getPlaybookTrackers(actor);
			expect(left).toEqual([]);
			expect(right).toEqual([]);
		});

		it("should return empty arrays for unknown playbook", () => {
			const actor = createMockActor();
			(actor.system.playbook as { name: string }).name = "Unknown Playbook";

			const { left, right } = getPlaybookTrackers(actor);
			expect(left).toEqual([]);
			expect(right).toEqual([]);
		});

		it("should return left trackers for The Bull", () => {
			const actor = createMockActor();
			(actor.system.playbook as { name: string }).name = "The Bull";

			const { left, right } = getPlaybookTrackers(actor);
			expect(left).toHaveLength(1);
			expect(right).toEqual([]);
		});

		it("should return both left and right trackers for The Soldier", () => {
			const actor = createMockActor();
			(actor.system.playbook as { name: string }).name = "The Soldier";

			const { left, right } = getPlaybookTrackers(actor);
			expect(left.length).toBeGreaterThan(0);
			expect(right.length).toBeGreaterThan(0);
		});
	});

	describe("getTrackerValue", () => {
		it("should return value from attrPath", () => {
			const actor = createMockActor();
			// Set theNova attribute
			(actor.system.attributes as Record<string, unknown>).theNova = { value: 2 };

			const tracker = { attrPath: "system.attributes.theNova.value" };
			expect(getTrackerValue(actor, tracker)).toBe(2);
		});

		it("should return 0 for missing attrPath value", () => {
			const actor = createMockActor();
			const tracker = { attrPath: "system.attributes.nonexistent.value" };
			expect(getTrackerValue(actor, tracker)).toBe(0);
		});

		it("should use custom getValue function if provided", () => {
			const actor = createMockActor();
			const tracker = {
				getValue: () => 42,
			};
			expect(getTrackerValue(actor, tracker)).toBe(42);
		});

		it("should return 0 for tracker without getValue or attrPath", () => {
			const actor = createMockActor();
			const tracker = {};
			expect(getTrackerValue(actor, tracker)).toBe(0);
		});
	});

	describe("getTrackerMax", () => {
		it("should return max from tracker config", () => {
			const tracker = { max: 5 };
			expect(getTrackerMax(tracker)).toBe(5);
		});

		it("should return value from maxPath if provided", () => {
			const actor = createMockActor();
			(actor.system.attributes as Record<string, unknown>).theDoomed = { max: 7 };

			const tracker = { maxPath: "system.attributes.theDoomed.max" };
			expect(getTrackerMax(tracker, actor)).toBe(7);
		});

		it("should return 5 as default", () => {
			const tracker = {};
			expect(getTrackerMax(tracker)).toBe(5);
		});

		it("should prefer numeric max over maxPath", () => {
			const actor = createMockActor();
			(actor.system.attributes as Record<string, unknown>).theDoomed = { max: 10 };

			const tracker = {
				max: 3,
				maxPath: "system.attributes.theDoomed.max",
			};
			expect(getTrackerMax(tracker, actor)).toBe(3);
		});
	});

	describe("buildTrackerData", () => {
		it("should build data for numeric tracker", () => {
			const actor = createMockActor();
			(actor.system.attributes as Record<string, unknown>).theNova = { value: 2 };

			const tracker = {
				id: "burn",
				type: TrackerType.NUMERIC,
				icon: "fa-solid fa-fire",
				attrPath: "system.attributes.theNova.value",
				min: 0,
				max: 3,
				color: "#f97316",
				label: "Burn",
				tooltip: (val: number) => `Burn: ${val}/3`,
			};

			const data = buildTrackerData(actor, tracker, { isGM: true, isSelf: false }) as Record<string, unknown>;

			expect(data.id).toBe("burn");
			expect(data.type).toBe(TrackerType.NUMERIC);
			expect(data.value).toBe(2);
			expect(data.max).toBe(3);
			expect(data.pct).toBe("67%");
			expect(data.canEdit).toBe(true);
			expect(data.fillable).toBe(true);
		});

		it("should set canEdit false for non-GM non-owner", () => {
			const actor = createMockActor();
			const tracker = {
				id: "test",
				type: TrackerType.NUMERIC,
				max: 5,
			};

			const data = buildTrackerData(actor, tracker, { isGM: false, isSelf: false }) as Record<string, unknown>;
			expect(data.canEdit).toBe(false);
			expect(data.canInteract).toBe(false);
		});

		it("should set canEdit true for owner", () => {
			const actor = createMockActor();
			const tracker = {
				id: "test",
				type: TrackerType.NUMERIC,
				max: 5,
			};

			const data = buildTrackerData(actor, tracker, { isGM: false, isSelf: true }) as Record<string, unknown>;
			expect(data.canEdit).toBe(true);
			expect(data.canInteract).toBe(true);
		});

		it("should calculate percentage correctly", () => {
			const actor = createMockActor();
			(actor.system.attributes as Record<string, unknown>).test = { value: 1 };

			const tracker = {
				id: "test",
				type: TrackerType.NUMERIC,
				attrPath: "system.attributes.test.value",
				max: 4,
			};

			const data = buildTrackerData(actor, tracker, { isGM: true, isSelf: false }) as Record<string, unknown>;
			expect(data.pct).toBe("25%");
		});

		it("should handle zero max gracefully", () => {
			const actor = createMockActor();
			const tracker = {
				id: "test",
				type: TrackerType.NUMERIC,
				max: 0,
			};

			const data = buildTrackerData(actor, tracker, { isGM: true, isSelf: false }) as Record<string, unknown>;
			expect(data.pct).toBe("0%");
		});

		it("should set canAct true for action trackers", () => {
			const actor = createMockActor();
			const tracker = {
				id: "test",
				type: TrackerType.ACTION,
			};

			const data = buildTrackerData(actor, tracker, { isGM: true, isSelf: false }) as Record<string, unknown>;
			expect(data.canAct).toBe(true);
			expect(data.canEdit).toBe(false);
		});

		it("should set fillable true for doom track", () => {
			const actor = createMockActor();
			const tracker = {
				id: "doom",
				type: TrackerType.DOOM_TRACK,
			};

			const data = buildTrackerData(actor, tracker, { isGM: true, isSelf: false }) as Record<string, unknown>;
			expect(data.fillable).toBe(true);
		});

		it("should set hasOngoing for Bull Heart when value > 0", () => {
			const actor = createMockActor();
			(actor.system.resources as Record<string, { value: number }>).ongoing.value = 1;

			const tracker = {
				id: "heart",
				type: TrackerType.BULL_HEART,
				getValue: (a: typeof actor) => (a.system.resources as Record<string, { value: number }>).ongoing.value,
			};

			const data = buildTrackerData(actor, tracker, { isGM: true, isSelf: false }) as Record<string, unknown>;
			expect(data.hasOngoing).toBe(true);
		});
	});

	describe("tracker configurations", () => {
		describe("The Nova - Burn tracker", () => {
			it("should have correct configuration", () => {
				const config = PLAYBOOK_TRACKERS["The Nova"] as { right: Array<Record<string, unknown>> };
				const burnTracker = config.right[0];

				expect(burnTracker.id).toBe("burn");
				expect(burnTracker.type).toBe(TrackerType.NUMERIC);
				expect(burnTracker.min).toBe(0);
				expect(burnTracker.max).toBe(3);
			});
		});

		describe("The Doomed - Doom tracker", () => {
			it("should have correct configuration", () => {
				const config = PLAYBOOK_TRACKERS["The Doomed"] as { right: Array<Record<string, unknown>> };
				const doomTracker = config.right[0];

				expect(doomTracker.id).toBe("doom");
				expect(doomTracker.type).toBe(TrackerType.DOOM_TRACK);
				expect(doomTracker.min).toBe(0);
				expect(doomTracker.max).toBe(5);
				expect(doomTracker.doomTriggersPath).toBeDefined();
			});
		});

		describe("The Bull - Heart tracker", () => {
			it("should have correct configuration", () => {
				const config = PLAYBOOK_TRACKERS["The Bull"] as { left: Array<Record<string, unknown>> };
				const heartTracker = config.left[0];

				expect(heartTracker.id).toBe("heart");
				expect(heartTracker.type).toBe(TrackerType.BULL_HEART);
				expect(heartTracker.min).toBe(0);
				expect(heartTracker.max).toBe(1);
			});
		});

		describe("The Beacon - Drives tracker", () => {
			it("should have correct configuration", () => {
				const config = PLAYBOOK_TRACKERS["The Beacon"] as { right: Array<Record<string, unknown>> };
				const drivesTracker = config.right[0];

				expect(drivesTracker.id).toBe("drives");
				expect(drivesTracker.type).toBe(TrackerType.CHECKLIST);
				expect(drivesTracker.fillable).toBe(true);
				expect(drivesTracker.max).toBe(4);
			});
		});

		describe("The Nomad - Roots tracker", () => {
			it("should have correct configuration", () => {
				const config = PLAYBOOK_TRACKERS["The Nomad"] as { right: Array<Record<string, unknown>> };
				const rootsTracker = config.right[0];

				expect(rootsTracker.id).toBe("roots");
				expect(rootsTracker.type).toBe(TrackerType.INFLUENCE_CHECKLIST);
				expect(rootsTracker.max).toBe(6);
			});
		});

		describe("The Soldier - dual trackers", () => {
			it("should have soldier tracker on left", () => {
				const config = PLAYBOOK_TRACKERS["The Soldier"] as { left: Array<Record<string, unknown>>; right: Array<Record<string, unknown>> };
				const soldierTracker = config.left[0];

				expect(soldierTracker.id).toBe("soldier");
				expect(soldierTracker.type).toBe(TrackerType.ACTION);
				expect(soldierTracker.min).toBe(-2);
				expect(soldierTracker.max).toBe(3);
			});

			it("should have recon tracker on right", () => {
				const config = PLAYBOOK_TRACKERS["The Soldier"] as { left: Array<Record<string, unknown>>; right: Array<Record<string, unknown>> };
				const reconTracker = config.right[0];

				expect(reconTracker.id).toBe("recon");
				expect(reconTracker.type).toBe(TrackerType.ACTION);
				expect(reconTracker.moveName).toBe("Before We Get Started");
			});
		});

		describe("The Janus - obligations tracker", () => {
			it("should have correct configuration", () => {
				const config = PLAYBOOK_TRACKERS["The Janus"] as { right: Array<Record<string, unknown>> };
				const tracker = config.right[0];

				expect(tracker.id).toBe("obligations");
				expect(tracker.type).toBe(TrackerType.ACTION);
				expect(tracker.action).toBe("roll");
				expect(tracker.moveName).toBe("When Time Passes");
			});
		});

		describe("The Legacy - time passes tracker", () => {
			it("should have correct configuration", () => {
				const config = PLAYBOOK_TRACKERS["The Legacy"] as { right: Array<Record<string, unknown>> };
				const tracker = config.right[0];

				expect(tracker.id).toBe("legacy");
				expect(tracker.type).toBe(TrackerType.ACTION);
				expect(tracker.action).toBe("roll");
			});
		});

		describe("The Innocent - steps tracker", () => {
			it("should have correct configuration", () => {
				const config = PLAYBOOK_TRACKERS["The Innocent"] as { right: Array<Record<string, unknown>> };
				const stepsTracker = config.right[0];

				expect(stepsTracker.id).toBe("steps");
				expect(stepsTracker.type).toBe(TrackerType.CHECKLIST);
				expect(stepsTracker.fillable).toBe(true);
				expect(stepsTracker.max).toBe(5);
				expect(stepsTracker.checkedOnly).toBe(true);
			});
		});

		describe("The Reformed - obligations tracker", () => {
			it("should have correct configuration", () => {
				const config = PLAYBOOK_TRACKERS["The Reformed"] as { right: Array<Record<string, unknown>> };
				const tracker = config.right[0];

				expect(tracker.id).toBe("obligations");
				expect(tracker.type).toBe(TrackerType.CHECKLIST);
				expect(tracker.isReformedObligations).toBe(true);
			});
		});

		describe("The Newborn - lessons tracker", () => {
			it("should have correct configuration", () => {
				const config = PLAYBOOK_TRACKERS["The Newborn"] as { right: Array<Record<string, unknown>> };
				const tracker = config.right[0];

				expect(tracker.id).toBe("lessons");
				expect(tracker.type).toBe(TrackerType.CHECKLIST);
				expect(tracker.fillable).toBe(true);
				expect(tracker.max).toBe(4);
			});
		});

		describe("The Star - audience tracker", () => {
			it("should have correct configuration", () => {
				const config = PLAYBOOK_TRACKERS["The Star"] as { right: Array<Record<string, unknown>> };
				const tracker = config.right[0];

				expect(tracker.id).toBe("audience");
				expect(tracker.type).toBe(TrackerType.CHECKLIST);
				expect(tracker.isStarAudience).toBe(true);
				expect(tracker.noActorNameInHeader).toBe(true);
				expect(tracker.noStrikethrough).toBe(true);
			});
		});

		describe("The Harbinger - memories tracker", () => {
			it("should have correct configuration", () => {
				const config = PLAYBOOK_TRACKERS["The Harbinger"] as { right: Array<Record<string, unknown>> };
				const tracker = config.right[0];

				expect(tracker.id).toBe("memories");
				expect(tracker.type).toBe(TrackerType.ACTION);
				expect(tracker.action).toBe("shareMemories");
			});
		});

		describe("The Scion - respect tracker", () => {
			it("should have correct configuration", () => {
				const config = PLAYBOOK_TRACKERS["The Scion"] as { right: Array<Record<string, unknown>> };
				const tracker = config.right[0];

				expect(tracker.id).toBe("respect");
				expect(tracker.type).toBe(TrackerType.ACTION);
				expect(tracker.action).toBe("share");
			});
		});

		describe("The Brain - gadgets tracker", () => {
			it("should have correct configuration", () => {
				const config = PLAYBOOK_TRACKERS["The Brain"] as { right: Array<Record<string, unknown>> };
				const tracker = config.right[0];

				expect(tracker.id).toBe("gadgets");
				expect(tracker.type).toBe(TrackerType.NUMERIC);
				expect(tracker.min).toBe(0);
				expect(tracker.max).toBe(99);
			});
		});
	});

	describe("getTrackerDataForActor", () => {
		it("should return structured tracker data for Nova", () => {
			const actor = createMockActor();
			(actor.system.playbook as { name: string }).name = "The Nova";
			(actor.system.attributes as Record<string, unknown>).theNova = { value: 2 };

			const result = getTrackerDataForActor(actor, { isGM: true, isSelf: true });

			expect(result.leftTop).toEqual([]);
			expect(result.leftBeside).toEqual([]);
			expect(result.rightTop).toHaveLength(1);
			expect((result.rightTop[0] as Record<string, unknown>).id).toBe("burn");
		});

		it("should return structured tracker data for Bull", () => {
			const actor = createMockActor();
			(actor.system.playbook as { name: string }).name = "The Bull";

			const result = getTrackerDataForActor(actor, { isGM: true, isSelf: true });

			expect(result.leftTop).toHaveLength(1);
			expect(result.leftBeside).toEqual([]);
			expect(result.rightTop).toEqual([]);
			expect((result.leftTop[0] as Record<string, unknown>).id).toBe("heart");
		});

		it("should return structured tracker data for Soldier (both sides)", () => {
			const actor = createMockActor();
			(actor.system.playbook as { name: string }).name = "The Soldier";
			(actor.system.attributes as Record<string, unknown>).theSoldier = { value: 1 };

			const result = getTrackerDataForActor(actor, { isGM: true, isSelf: true });

			expect(result.leftTop).toHaveLength(1);
			expect(result.rightTop).toHaveLength(1);
		});

		it("should return empty arrays for playbook without trackers", () => {
			const actor = createMockActor();
			(actor.system.playbook as { name: string }).name = "The Delinquent";

			const result = getTrackerDataForActor(actor, { isGM: true, isSelf: true });

			expect(result.leftTop).toEqual([]);
			expect(result.leftBeside).toEqual([]);
			expect(result.rightTop).toEqual([]);
		});

		it("should set canInteract based on isGM/isSelf", () => {
			const actor = createMockActor();
			(actor.system.playbook as { name: string }).name = "The Nova";

			const asGM = getTrackerDataForActor(actor, { isGM: true, isSelf: false });
			const asSelf = getTrackerDataForActor(actor, { isGM: false, isSelf: true });
			const asOther = getTrackerDataForActor(actor, { isGM: false, isSelf: false });

			expect((asGM.rightTop[0] as Record<string, unknown>).canInteract).toBe(true);
			expect((asSelf.rightTop[0] as Record<string, unknown>).canInteract).toBe(true);
			expect((asOther.rightTop[0] as Record<string, unknown>).canInteract).toBe(false);
		});
	});

	describe("changeTrackerValue", () => {
		function createActorWithUpdate() {
			const actor = createMockActor();
			const updateCalls: Record<string, unknown>[] = [];
			(actor as any).update = jest.fn(async (data: Record<string, unknown>) => {
				updateCalls.push(data);
				// Also apply the update to the actor system
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

		it("should increment numeric tracker value within bounds", async () => {
			const actor = createActorWithUpdate();
			(actor.system.playbook as { name: string }).name = "The Nova";
			(actor.system.attributes as Record<string, unknown>).theNova = { value: 1 };

			const result = await changeTrackerValue(actor, "burn", 1);

			expect(result).toBe(true);
			expect((actor as any).updateCalls[0]["system.attributes.theNova.value"]).toBe(2);
		});

		it("should decrement numeric tracker value within bounds", async () => {
			const actor = createActorWithUpdate();
			(actor.system.playbook as { name: string }).name = "The Nova";
			(actor.system.attributes as Record<string, unknown>).theNova = { value: 2 };

			const result = await changeTrackerValue(actor, "burn", -1);

			expect(result).toBe(true);
			expect((actor as any).updateCalls[0]["system.attributes.theNova.value"]).toBe(1);
		});

		it("should clamp at maximum value", async () => {
			const actor = createActorWithUpdate();
			(actor.system.playbook as { name: string }).name = "The Nova";
			(actor.system.attributes as Record<string, unknown>).theNova = { value: 3 }; // Already at max

			const result = await changeTrackerValue(actor, "burn", 1);

			// Should not update since already at max
			expect(result).toBe(false);
		});

		it("should clamp at minimum value", async () => {
			const actor = createActorWithUpdate();
			(actor.system.playbook as { name: string }).name = "The Nova";
			(actor.system.attributes as Record<string, unknown>).theNova = { value: 0 }; // Already at min

			const result = await changeTrackerValue(actor, "burn", -1);

			// Should not update since already at min
			expect(result).toBe(false);
		});

		it("should return false for non-existent tracker", async () => {
			const actor = createActorWithUpdate();
			(actor.system.playbook as { name: string }).name = "The Nova";

			const result = await changeTrackerValue(actor, "nonexistent", 1);

			expect(result).toBe(false);
		});

		it("should return false for non-numeric tracker", async () => {
			const actor = createActorWithUpdate();
			(actor.system.playbook as { name: string }).name = "The Janus";

			// obligations is ACTION type, not NUMERIC
			const result = await changeTrackerValue(actor, "obligations", 1);

			expect(result).toBe(false);
		});

		it("should handle large delta values", async () => {
			const actor = createActorWithUpdate();
			(actor.system.playbook as { name: string }).name = "The Nova";
			(actor.system.attributes as Record<string, unknown>).theNova = { value: 1 };

			const result = await changeTrackerValue(actor, "burn", 10);

			expect(result).toBe(true);
			// Should clamp to max of 3
			expect((actor as any).updateCalls[0]["system.attributes.theNova.value"]).toBe(3);
		});

		it("should handle large negative delta values", async () => {
			const actor = createActorWithUpdate();
			(actor.system.playbook as { name: string }).name = "The Nova";
			(actor.system.attributes as Record<string, unknown>).theNova = { value: 2 };

			const result = await changeTrackerValue(actor, "burn", -10);

			expect(result).toBe(true);
			// Should clamp to min of 0
			expect((actor as any).updateCalls[0]["system.attributes.theNova.value"]).toBe(0);
		});
	});

	describe("custom getValue functions", () => {
		it("should use Bull Heart getValue for ongoing value", () => {
			const actor = createMockActor();
			(actor.system.playbook as { name: string }).name = "The Bull";
			(actor.system.resources as Record<string, { value: number }>).ongoing.value = 1;

			const { left } = getPlaybookTrackers(actor);
			const heartTracker = left[0] as Record<string, unknown>;
			const getValue = heartTracker.getValue as (a: unknown) => number;

			expect(getValue(actor)).toBe(1);
		});

		it("should use Beacon drives getValue for checked count", () => {
			const actor = createMockActor();
			(actor.system.playbook as { name: string }).name = "The Beacon";
			(actor.system.attributes as Record<string, unknown>).theBeacon = {
				options: {
					drive1: { value: true, label: "Drive 1" },
					drive2: { value: true, label: "Drive 2" },
					drive3: { value: false, label: "Drive 3" },
				},
			};

			const { right } = getPlaybookTrackers(actor);
			const drivesTracker = right[0] as Record<string, unknown>;
			const getValue = drivesTracker.getValue as (a: unknown) => number;

			expect(getValue(actor)).toBe(2); // 2 checked
		});

		it("should use Nomad roots getValue for influence count", () => {
			const actor = createMockActor();
			(actor.system.playbook as { name: string }).name = "The Nomad";
			// Mock getFlag to return influence list
			(actor as any).getFlag = (ns: string, key: string) => {
				if (key === "influences") {
					return [
						{ name: "Ally 1", hasInfluenceOver: true },
						{ name: "Ally 2", hasInfluenceOver: true },
						{ name: "Enemy", hasInfluenceOver: false },
					];
				}
				return null;
			};

			const { right } = getPlaybookTrackers(actor);
			const rootsTracker = right[0] as Record<string, unknown>;
			const getValue = rootsTracker.getValue as (a: unknown) => number;

			expect(getValue(actor)).toBe(2); // 2 with hasInfluenceOver
		});

		it("should use Innocent steps getValue for checked count", () => {
			const actor = createMockActor();
			(actor.system.playbook as { name: string }).name = "The Innocent";
			(actor.system.attributes as Record<string, unknown>).theInnocent = {
				options: {
					step1: { value: true, label: "Step 1" },
					step2: { value: false, label: "Step 2" },
				},
			};

			const { right } = getPlaybookTrackers(actor);
			const stepsTracker = right[0] as Record<string, unknown>;
			const getValue = stepsTracker.getValue as (a: unknown) => number;

			expect(getValue(actor)).toBe(1); // 1 checked
		});
	});

	describe("tooltip functions", () => {
		it("should generate correct tooltip for Nova burn", () => {
			const config = PLAYBOOK_TRACKERS["The Nova"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];
			const tooltip = (tracker.tooltip as (val: number) => string)(2);

			expect(tooltip).toBe("Burn: 2/3");
		});

		it("should generate correct tooltip for Doomed doom", () => {
			const config = PLAYBOOK_TRACKERS["The Doomed"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];
			const tooltip = (tracker.tooltip as (val: number, max: number) => string)(3, 5);

			expect(tooltip).toBe("Doom: 3/5 (click to increment)");
		});

		it("should generate correct tooltip for Bull Heart active", () => {
			const config = PLAYBOOK_TRACKERS["The Bull"] as { left: Array<Record<string, unknown>> };
			const tracker = config.left[0];
			const tooltip = (tracker.tooltip as (val: number) => string)(1);

			expect(tooltip).toContain("active");
		});

		it("should generate correct tooltip for Bull Heart inactive", () => {
			const config = PLAYBOOK_TRACKERS["The Bull"] as { left: Array<Record<string, unknown>> };
			const tracker = config.left[0];
			const tooltip = (tracker.tooltip as (val: number) => string)(0);

			expect(tooltip).not.toContain("active)");
		});

		it("should generate correct tooltip for Beacon drives", () => {
			const config = PLAYBOOK_TRACKERS["The Beacon"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];
			const tooltip = (tracker.tooltip as (val: number) => string)(2);

			expect(tooltip).toBe("Drives: 2/4 (click to share)");
		});

		it("should generate correct tooltip for Nomad roots", () => {
			const config = PLAYBOOK_TRACKERS["The Nomad"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];
			const tooltip = (tracker.tooltip as (val: number) => string)(3);

			expect(tooltip).toBe("Influence given: 3/6 (click to share)");
		});

		it("should generate correct tooltip for action trackers (Janus)", () => {
			const config = PLAYBOOK_TRACKERS["The Janus"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];
			const tooltip = (tracker.tooltip as () => string)();

			expect(tooltip).toBe("Roll: When Time Passes");
		});
	});

	describe("tracker colors", () => {
		it("should have distinct colors for different tracker types", () => {
			const colors = new Set<string>();

			// Collect colors from various playbooks
			const playbooks = ["The Nova", "The Doomed", "The Bull", "The Beacon", "The Nomad"];
			for (const pb of playbooks) {
				const config = PLAYBOOK_TRACKERS[pb] as { left?: Array<Record<string, unknown>>; right?: Array<Record<string, unknown>> };
				const trackers = [...(config.left ?? []), ...(config.right ?? [])];
				for (const t of trackers) {
					if (t.color) colors.add(t.color as string);
				}
			}

			// Should have multiple distinct colors
			expect(colors.size).toBeGreaterThanOrEqual(4);
		});

		it("should use consistent color format (#hex)", () => {
			const config = PLAYBOOK_TRACKERS["The Nova"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.color).toMatch(/^#[0-9a-fA-F]{6}$/);
		});
	});

	describe("tracker icons", () => {
		it("should have Font Awesome icons for all trackers", () => {
			const playbooks = ["The Nova", "The Doomed", "The Bull", "The Beacon", "The Janus"];
			for (const pb of playbooks) {
				const config = PLAYBOOK_TRACKERS[pb] as { left?: Array<Record<string, unknown>>; right?: Array<Record<string, unknown>> };
				const trackers = [...(config.left ?? []), ...(config.right ?? [])];
				for (const t of trackers) {
					expect(t.icon).toBeDefined();
					expect(t.icon).toMatch(/^fa-/);
				}
			}
		});
	});

	describe("playbooks with null config", () => {
		it("should have null for The Delinquent", () => {
			expect(PLAYBOOK_TRACKERS["The Delinquent"]).toBeNull();
		});

		it("should have null for The Outsider", () => {
			expect(PLAYBOOK_TRACKERS["The Outsider"]).toBeNull();
		});

		it("should have null for The Transformed", () => {
			expect(PLAYBOOK_TRACKERS["The Transformed"]).toBeNull();
		});

		it("should have null for The Protégé", () => {
			expect(PLAYBOOK_TRACKERS["The Protégé"]).toBeNull();
		});

		it("should have null for The Joined", () => {
			expect(PLAYBOOK_TRACKERS["The Joined"]).toBeNull();
		});
	});

	describe("attribute paths", () => {
		it("should have valid attrPath for numeric trackers", () => {
			const config = PLAYBOOK_TRACKERS["The Nova"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.attrPath).toBe("system.attributes.theNova.value");
		});

		it("should have valid attrPath for doom tracker", () => {
			const config = PLAYBOOK_TRACKERS["The Doomed"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.attrPath).toBe("system.attributes.theDoomed.value");
			expect(tracker.maxPath).toBe("system.attributes.theDoomed.max");
			expect(tracker.doomTriggersPath).toBe("system.attributes.bringsDoomCloser.options");
		});

		it("should have valid attrPath for checklist trackers", () => {
			const config = PLAYBOOK_TRACKERS["The Beacon"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.attrPath).toBe("system.attributes.theBeacon.options");
		});

		it("should have dual attrPaths for Star audience", () => {
			const config = PLAYBOOK_TRACKERS["The Star"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.attrPathAdvantages).toBe("system.attributes.theStarAdvantages.options");
			expect(tracker.attrPathDemands).toBe("system.attributes.theStarDemands.options");
		});
	});

	describe("compendium UUIDs", () => {
		it("should have compendiumUUID for checklist trackers", () => {
			const checklistPlaybooks = ["The Beacon", "The Innocent", "The Newborn", "The Reformed", "The Star", "The Nomad"];

			for (const pb of checklistPlaybooks) {
				const config = PLAYBOOK_TRACKERS[pb] as { right: Array<Record<string, unknown>> };
				if (config?.right?.[0]) {
					expect(config.right[0].compendiumUUID).toBeDefined();
					expect(config.right[0].compendiumUUID).toContain("Compendium.");
				}
			}
		});

		it("should have compendiumUUID for Harbinger", () => {
			const config = PLAYBOOK_TRACKERS["The Harbinger"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.compendiumUUID).toBeDefined();
			expect(tracker.compendiumUUID).toContain("Compendium.");
		});
	});

	describe("bounds validation", () => {
		it("Nova burn should have min 0, max 3", () => {
			const config = PLAYBOOK_TRACKERS["The Nova"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.min).toBe(0);
			expect(tracker.max).toBe(3);
		});

		it("Doomed doom should have min 0, max 5", () => {
			const config = PLAYBOOK_TRACKERS["The Doomed"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.min).toBe(0);
			expect(tracker.max).toBe(5);
		});

		it("Bull heart should have min 0, max 1 (toggle)", () => {
			const config = PLAYBOOK_TRACKERS["The Bull"] as { left: Array<Record<string, unknown>> };
			const tracker = config.left[0];

			expect(tracker.min).toBe(0);
			expect(tracker.max).toBe(1);
		});

		it("Soldier should have min -2, max 3 (6th label bounds)", () => {
			const config = PLAYBOOK_TRACKERS["The Soldier"] as { left: Array<Record<string, unknown>> };
			const tracker = config.left[0];

			expect(tracker.min).toBe(-2);
			expect(tracker.max).toBe(3);
		});

		it("Brain gadgets should have min 0, max 99 (practically unlimited)", () => {
			const config = PLAYBOOK_TRACKERS["The Brain"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.min).toBe(0);
			expect(tracker.max).toBe(99);
		});

		it("Beacon drives should have max 4", () => {
			const config = PLAYBOOK_TRACKERS["The Beacon"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.max).toBe(4);
		});

		it("Innocent steps should have max 5", () => {
			const config = PLAYBOOK_TRACKERS["The Innocent"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.max).toBe(5);
		});

		it("Newborn lessons should have max 4", () => {
			const config = PLAYBOOK_TRACKERS["The Newborn"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.max).toBe(4);
		});

		it("Nomad roots should have max 6", () => {
			const config = PLAYBOOK_TRACKERS["The Nomad"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.max).toBe(6);
		});
	});

	describe("special tracker flags", () => {
		it("checkedOnly flag for Innocent", () => {
			const config = PLAYBOOK_TRACKERS["The Innocent"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.checkedOnly).toBe(true);
		});

		it("noActorNameInHeader flag for Star", () => {
			const config = PLAYBOOK_TRACKERS["The Star"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.noActorNameInHeader).toBe(true);
		});

		it("noStrikethrough flag for Star", () => {
			const config = PLAYBOOK_TRACKERS["The Star"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.noStrikethrough).toBe(true);
		});

		it("isReformedObligations flag for Reformed", () => {
			const config = PLAYBOOK_TRACKERS["The Reformed"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.isReformedObligations).toBe(true);
		});

		it("isStarAudience flag for Star", () => {
			const config = PLAYBOOK_TRACKERS["The Star"] as { right: Array<Record<string, unknown>> };
			const tracker = config.right[0];

			expect(tracker.isStarAudience).toBe(true);
		});

		it("fillable flag for appropriate trackers", () => {
			const fillablePlaybooks = ["The Beacon", "The Innocent", "The Newborn", "The Nomad"];

			for (const pb of fillablePlaybooks) {
				const config = PLAYBOOK_TRACKERS[pb] as { right: Array<Record<string, unknown>> };
				expect(config.right[0].fillable).toBe(true);
			}
		});
	});
});
