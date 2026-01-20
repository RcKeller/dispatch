/**
 * Tests for resource-trackers.ts
 * Playbook-specific resource tracker configurations and helpers
 */

import { createMockActor } from "../__mocks__/foundry";

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

	beforeAll(async () => {
		const module = await import("../../src/module/resource-trackers");
		TrackerType = module.TrackerType;
		PLAYBOOK_TRACKERS = module.PLAYBOOK_TRACKERS;
		getPlaybookName = module.getPlaybookName;
		getPlaybookTrackers = module.getPlaybookTrackers;
		getTrackerValue = module.getTrackerValue;
		getTrackerMax = module.getTrackerMax;
		buildTrackerData = module.buildTrackerData;
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
	});
});
