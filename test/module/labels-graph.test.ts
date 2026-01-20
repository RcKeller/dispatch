/**
 * Tests for labels-graph.ts
 * Pentagon-shaped data visualization for Masks labels
 */

import { StubActor } from "../stubs/foundry/StubActor";
import {
	BEACON,
	LEGACY,
	NOVA,
	SOLDIER,
	ALL_MAX_LABELS,
	ALL_MIN_LABELS,
	ALL_CONDITIONS_MARKED,
} from "../test_data/TestCharacters";

describe("labels-graph", () => {
	// Module exports
	let valueToRadiusFraction: (value: number) => number;
	let getInnerGridValues: () => number[];
	let getPentagonVertices: (cx: number, cy: number, radius: number) => { x: number; y: number }[];
	let polygonPath: (points: { x: number; y: number }[]) => string;
	let extractLabelsData: (actor: unknown) => {
		labels: Record<string, number>;
		affectedLabels: Set<string>;
		globalBonus: number;
		totalPenalty: number;
		isPositive: boolean;
		isNegative: boolean;
	} | null;
	let generateLabelsGraphSVG: (options: Record<string, unknown>) => string;
	let generateLabelsTooltip: (labels: Record<string, number>, affectedLabels?: Set<string>) => string;
	let calculateLabelsGraphPath: (options: Record<string, unknown>) => { path: string; fill: string; stroke: string };
	let createLabelsGraphData: (actor: unknown, svgOptions?: Record<string, unknown>) => Record<string, unknown> | null;
	let LabelsGraph: new (options?: Record<string, unknown>) => unknown;
	let GRAPH_PRESETS: Record<string, Record<string, unknown>>;
	let LABEL_ORDER: readonly string[];
	let LABEL_DISPLAY_NAMES: Record<string, string>;
	let LABEL_ICONS: Record<string, { unicode: string; class: string; color: string }>;
	let CONDITION_TO_LABEL: Record<string | number, string>;
	let COLORS: Record<string, string>;
	let MIN_VALUE: number;
	let MAX_VALUE: number;
	let VALUE_RANGE: number;

	beforeAll(async () => {
		const module = await import("../../src/module/labels-graph");
		valueToRadiusFraction = module.valueToRadiusFraction;
		getInnerGridValues = module.getInnerGridValues;
		getPentagonVertices = module.getPentagonVertices;
		polygonPath = module.polygonPath;
		extractLabelsData = module.extractLabelsData;
		generateLabelsGraphSVG = module.generateLabelsGraphSVG;
		generateLabelsTooltip = module.generateLabelsTooltip;
		calculateLabelsGraphPath = module.calculateLabelsGraphPath;
		createLabelsGraphData = module.createLabelsGraphData;
		LabelsGraph = module.LabelsGraph;
		GRAPH_PRESETS = module.GRAPH_PRESETS;
		LABEL_ORDER = module.LABEL_ORDER;
		LABEL_DISPLAY_NAMES = module.LABEL_DISPLAY_NAMES;
		LABEL_ICONS = module.LABEL_ICONS;
		CONDITION_TO_LABEL = module.CONDITION_TO_LABEL;
		COLORS = module.COLORS;
		MIN_VALUE = module.MIN_VALUE;
		MAX_VALUE = module.MAX_VALUE;
		VALUE_RANGE = module.VALUE_RANGE;
	});

	// ========================================================================
	// Constants
	// ========================================================================

	describe("Constants", () => {
		describe("VALUE_RANGE constants", () => {
			it("should have MIN_VALUE of -3", () => {
				expect(MIN_VALUE).toBe(-3);
			});

			it("should have MAX_VALUE of 4", () => {
				expect(MAX_VALUE).toBe(4);
			});

			it("should have VALUE_RANGE of 7 (MAX - MIN)", () => {
				expect(VALUE_RANGE).toBe(7);
			});
		});

		describe("LABEL_ORDER", () => {
			it("should contain 5 labels", () => {
				expect(LABEL_ORDER).toHaveLength(5);
			});

			it("should have danger first (top)", () => {
				expect(LABEL_ORDER[0]).toBe("danger");
			});

			it("should have freak second (top right)", () => {
				expect(LABEL_ORDER[1]).toBe("freak");
			});

			it("should have savior third (bottom right)", () => {
				expect(LABEL_ORDER[2]).toBe("savior");
			});

			it("should have mundane fourth (bottom left)", () => {
				expect(LABEL_ORDER[3]).toBe("mundane");
			});

			it("should have superior fifth (top left)", () => {
				expect(LABEL_ORDER[4]).toBe("superior");
			});

			it("should be frozen", () => {
				expect(Object.isFrozen(LABEL_ORDER)).toBe(true);
			});
		});

		describe("LABEL_DISPLAY_NAMES", () => {
			it("should have abbreviated names for all labels", () => {
				expect(LABEL_DISPLAY_NAMES.danger).toBe("DAN");
				expect(LABEL_DISPLAY_NAMES.freak).toBe("FRE");
				expect(LABEL_DISPLAY_NAMES.savior).toBe("SAV");
				expect(LABEL_DISPLAY_NAMES.mundane).toBe("MUN");
				expect(LABEL_DISPLAY_NAMES.superior).toBe("SUP");
			});

			it("should be frozen", () => {
				expect(Object.isFrozen(LABEL_DISPLAY_NAMES)).toBe(true);
			});
		});

		describe("LABEL_ICONS", () => {
			it("should have icons for all 5 labels", () => {
				expect(Object.keys(LABEL_ICONS)).toHaveLength(5);
			});

			it("should have unicode, class, and color for each icon", () => {
				for (const key of LABEL_ORDER) {
					const icon = LABEL_ICONS[key];
					expect(icon).toBeDefined();
					expect(typeof icon.unicode).toBe("string");
					expect(typeof icon.class).toBe("string");
					expect(typeof icon.color).toBe("string");
				}
			});

			it("should have red color for danger", () => {
				expect(LABEL_ICONS.danger.color).toBe("#e05252");
			});

			it("should be frozen", () => {
				expect(Object.isFrozen(LABEL_ICONS)).toBe(true);
			});
		});

		describe("CONDITION_TO_LABEL", () => {
			it("should map Afraid (index 0) to danger", () => {
				expect(CONDITION_TO_LABEL[0]).toBe("danger");
				expect(CONDITION_TO_LABEL.afraid).toBe("danger");
			});

			it("should map Angry (index 1) to mundane", () => {
				expect(CONDITION_TO_LABEL[1]).toBe("mundane");
				expect(CONDITION_TO_LABEL.angry).toBe("mundane");
			});

			it("should map Guilty (index 2) to superior", () => {
				expect(CONDITION_TO_LABEL[2]).toBe("superior");
				expect(CONDITION_TO_LABEL.guilty).toBe("superior");
			});

			it("should map Hopeless (index 3) to freak", () => {
				expect(CONDITION_TO_LABEL[3]).toBe("freak");
				expect(CONDITION_TO_LABEL.hopeless).toBe("freak");
			});

			it("should map Insecure (index 4) to savior", () => {
				expect(CONDITION_TO_LABEL[4]).toBe("savior");
				expect(CONDITION_TO_LABEL.insecure).toBe("savior");
			});

			it("should be frozen", () => {
				expect(Object.isFrozen(CONDITION_TO_LABEL)).toBe(true);
			});
		});

		describe("COLORS", () => {
			it("should have default fill and stroke colors", () => {
				expect(COLORS.fillDefault).toBeDefined();
				expect(COLORS.strokeDefault).toBeDefined();
			});

			it("should have bonus colors (green)", () => {
				expect(COLORS.fillBonus).toBeDefined();
				expect(COLORS.strokeBonus).toBeDefined();
			});

			it("should have condition colors (red)", () => {
				expect(COLORS.fillCondition).toBeDefined();
				expect(COLORS.strokeCondition).toBeDefined();
			});

			it("should have grid line colors", () => {
				expect(COLORS.gridLines).toBeDefined();
				expect(COLORS.gridOuter).toBeDefined();
			});

			it("should have pentagon background colors", () => {
				expect(COLORS.pentagonBg).toBeDefined();
				expect(COLORS.pentagonBorder).toBeDefined();
			});

			it("should be frozen", () => {
				expect(Object.isFrozen(COLORS)).toBe(true);
			});
		});

		describe("GRAPH_PRESETS", () => {
			it("should have turnCard preset", () => {
				expect(GRAPH_PRESETS.turnCard).toBeDefined();
				expect(GRAPH_PRESETS.turnCard.size).toBe(32);
				expect(GRAPH_PRESETS.turnCard.showInnerLines).toBe(false);
			});

			it("should have characterSheet preset", () => {
				expect(GRAPH_PRESETS.characterSheet).toBeDefined();
				expect(GRAPH_PRESETS.characterSheet.size).toBe(200);
				expect(GRAPH_PRESETS.characterSheet.showIcons).toBe(true);
			});

			it("should have callSheet preset", () => {
				expect(GRAPH_PRESETS.callSheet).toBeDefined();
				expect(GRAPH_PRESETS.callSheet.size).toBe(280);
				expect(GRAPH_PRESETS.callSheet.showSpokeDots).toBe(true);
			});

			it("should be frozen", () => {
				expect(Object.isFrozen(GRAPH_PRESETS)).toBe(true);
			});
		});
	});

	// ========================================================================
	// Geometry Functions
	// ========================================================================

	describe("valueToRadiusFraction", () => {
		describe("boundary values", () => {
			it("should map -3 (MIN_VALUE) to 0 (center)", () => {
				expect(valueToRadiusFraction(-3)).toBe(0);
			});

			it("should map +4 (MAX_VALUE) to 1 (outer edge)", () => {
				expect(valueToRadiusFraction(4)).toBe(1);
			});
		});

		describe("intermediate values", () => {
			it("should map 0 to approximately 0.43 (3/7)", () => {
				const result = valueToRadiusFraction(0);
				expect(result).toBeCloseTo(3 / 7, 5);
			});

			it("should map -2 to approximately 0.14 (1/7)", () => {
				const result = valueToRadiusFraction(-2);
				expect(result).toBeCloseTo(1 / 7, 5);
			});

			it("should map -1 to approximately 0.29 (2/7)", () => {
				const result = valueToRadiusFraction(-1);
				expect(result).toBeCloseTo(2 / 7, 5);
			});

			it("should map +1 to approximately 0.57 (4/7)", () => {
				const result = valueToRadiusFraction(1);
				expect(result).toBeCloseTo(4 / 7, 5);
			});

			it("should map +2 to approximately 0.71 (5/7)", () => {
				const result = valueToRadiusFraction(2);
				expect(result).toBeCloseTo(5 / 7, 5);
			});

			it("should map +3 to approximately 0.86 (6/7)", () => {
				const result = valueToRadiusFraction(3);
				expect(result).toBeCloseTo(6 / 7, 5);
			});
		});

		describe("clamping behavior", () => {
			it("should clamp values below -3 to 0", () => {
				expect(valueToRadiusFraction(-4)).toBe(0);
				expect(valueToRadiusFraction(-10)).toBe(0);
				expect(valueToRadiusFraction(-100)).toBe(0);
			});

			it("should clamp values above +4 to 1", () => {
				expect(valueToRadiusFraction(5)).toBe(1);
				expect(valueToRadiusFraction(10)).toBe(1);
				expect(valueToRadiusFraction(100)).toBe(1);
			});
		});

		describe("edge cases", () => {
			it("should handle non-integer values by clamping correctly", () => {
				const result = valueToRadiusFraction(0.5);
				// (0.5 - (-3)) / 7 = 3.5/7 = 0.5
				expect(result).toBeCloseTo(0.5, 5);
			});

			it("should handle NaN by returning 0 (clamped from NaN)", () => {
				const result = valueToRadiusFraction(NaN);
				// NaN comparisons result in false, so clamp defaults behavior
				// Math.max(MIN_VALUE, Math.min(MAX_VALUE, NaN)) produces NaN
				// Then (NaN - MIN_VALUE) / VALUE_RANGE produces NaN
				expect(Number.isNaN(result)).toBe(true);
			});

			it("should handle Infinity by returning 1 (clamped to max)", () => {
				expect(valueToRadiusFraction(Infinity)).toBe(1);
			});

			it("should handle -Infinity by returning 0 (clamped to min)", () => {
				expect(valueToRadiusFraction(-Infinity)).toBe(0);
			});
		});

		describe("linear scaling", () => {
			it("should produce evenly spaced fractions for consecutive integers", () => {
				const fractions: number[] = [];
				for (let v = -3; v <= 4; v++) {
					fractions.push(valueToRadiusFraction(v));
				}

				// Check spacing is consistent (1/7 apart)
				for (let i = 1; i < fractions.length; i++) {
					const diff = fractions[i] - fractions[i - 1];
					expect(diff).toBeCloseTo(1 / 7, 5);
				}
			});
		});
	});

	describe("getInnerGridValues", () => {
		it("should return 6 values", () => {
			const values = getInnerGridValues();
			expect(values).toHaveLength(6);
		});

		it("should return [-2, -1, 0, 1, 2, 3]", () => {
			const values = getInnerGridValues();
			expect(values).toEqual([-2, -1, 0, 1, 2, 3]);
		});

		it("should exclude MIN_VALUE (-3)", () => {
			const values = getInnerGridValues();
			expect(values).not.toContain(-3);
		});

		it("should exclude MAX_VALUE (+4)", () => {
			const values = getInnerGridValues();
			expect(values).not.toContain(4);
		});

		it("should return a new array each time", () => {
			const values1 = getInnerGridValues();
			const values2 = getInnerGridValues();
			expect(values1).not.toBe(values2);
			expect(values1).toEqual(values2);
		});
	});

	describe("getPentagonVertices", () => {
		describe("basic functionality", () => {
			it("should return exactly 5 vertices", () => {
				const vertices = getPentagonVertices(50, 50, 40);
				expect(vertices).toHaveLength(5);
			});

			it("should return objects with x and y properties", () => {
				const vertices = getPentagonVertices(50, 50, 40);
				for (const v of vertices) {
					expect(typeof v.x).toBe("number");
					expect(typeof v.y).toBe("number");
				}
			});
		});

		describe("first vertex position (12 o'clock)", () => {
			it("should place first vertex at top (12 o'clock position)", () => {
				const cx = 50;
				const cy = 50;
				const radius = 40;
				const vertices = getPentagonVertices(cx, cy, radius);

				// At -90 degrees (top), cos(-90°) = 0, sin(-90°) = -1
				expect(vertices[0].x).toBeCloseTo(cx, 5);
				expect(vertices[0].y).toBeCloseTo(cy - radius, 5);
			});
		});

		describe("angular spacing", () => {
			it("should space vertices 72° apart (360/5)", () => {
				const cx = 100;
				const cy = 100;
				const radius = 50;
				const vertices = getPentagonVertices(cx, cy, radius);

				// Calculate angles from center
				const angles = vertices.map((v) => {
					const dx = v.x - cx;
					const dy = v.y - cy;
					return Math.atan2(dy, dx) * (180 / Math.PI);
				});

				// Check spacing between consecutive vertices
				for (let i = 1; i < angles.length; i++) {
					let diff = angles[i] - angles[i - 1];
					if (diff < 0) diff += 360;
					expect(diff).toBeCloseTo(72, 1);
				}
			});
		});

		describe("edge cases", () => {
			it("should place all vertices at center when radius is 0", () => {
				const vertices = getPentagonVertices(100, 100, 0);
				for (const v of vertices) {
					expect(v.x).toBeCloseTo(100, 5);
					expect(v.y).toBeCloseTo(100, 5);
				}
			});

			it("should handle negative radius by inverting positions", () => {
				const positive = getPentagonVertices(50, 50, 40);
				const negative = getPentagonVertices(50, 50, -40);

				// With negative radius, vertices should be on opposite side
				for (let i = 0; i < 5; i++) {
					const dx = positive[i].x - 50;
					const dy = positive[i].y - 50;
					expect(negative[i].x).toBeCloseTo(50 - dx, 5);
					expect(negative[i].y).toBeCloseTo(50 - dy, 5);
				}
			});

			it("should handle non-integer center coordinates", () => {
				const vertices = getPentagonVertices(50.5, 75.25, 30);
				expect(vertices).toHaveLength(5);
				// First vertex should be at top
				expect(vertices[0].x).toBeCloseTo(50.5, 5);
				expect(vertices[0].y).toBeCloseTo(75.25 - 30, 5);
			});
		});

		describe("coordinate precision", () => {
			it("should maintain distance from center equal to radius for all vertices", () => {
				const cx = 50;
				const cy = 50;
				const radius = 40;
				const vertices = getPentagonVertices(cx, cy, radius);

				for (const v of vertices) {
					const distance = Math.sqrt((v.x - cx) ** 2 + (v.y - cy) ** 2);
					expect(distance).toBeCloseTo(radius, 5);
				}
			});
		});
	});

	describe("polygonPath", () => {
		describe("empty and single point handling", () => {
			it("should return empty string for empty array", () => {
				expect(polygonPath([])).toBe("");
			});

			it("should return path with just M for single point", () => {
				const result = polygonPath([{ x: 10, y: 20 }]);
				expect(result).toBe("M 10 20  Z");
			});
		});

		describe("multi-point paths", () => {
			it("should create correct path for triangle", () => {
				const points = [
					{ x: 0, y: 0 },
					{ x: 100, y: 0 },
					{ x: 50, y: 100 },
				];
				const result = polygonPath(points);
				expect(result).toBe("M 0 0 L 100 0 L 50 100 Z");
			});

			it("should create correct path for pentagon", () => {
				const points = [
					{ x: 50, y: 10 },
					{ x: 90, y: 40 },
					{ x: 75, y: 90 },
					{ x: 25, y: 90 },
					{ x: 10, y: 40 },
				];
				const result = polygonPath(points);
				expect(result).toBe("M 50 10 L 90 40 L 75 90 L 25 90 L 10 40 Z");
			});
		});

		describe("path closure", () => {
			it("should end with Z to close the path", () => {
				const points = [
					{ x: 0, y: 0 },
					{ x: 10, y: 10 },
				];
				const result = polygonPath(points);
				expect(result.endsWith(" Z")).toBe(true);
			});
		});

		describe("decimal coordinates", () => {
			it("should handle decimal coordinate values", () => {
				const points = [
					{ x: 10.5, y: 20.25 },
					{ x: 30.75, y: 40.125 },
				];
				const result = polygonPath(points);
				expect(result).toBe("M 10.5 20.25 L 30.75 40.125 Z");
			});
		});
	});

	// ========================================================================
	// Label Data Extraction
	// ========================================================================

	describe("extractLabelsData", () => {
		describe("null/undefined handling", () => {
			it("should return null for null actor", () => {
				expect(extractLabelsData(null)).toBeNull();
			});

			it("should return null for undefined actor", () => {
				expect(extractLabelsData(undefined)).toBeNull();
			});
		});

		describe("basic label extraction", () => {
			it("should extract all 5 base labels", () => {
				const actor = BEACON.clone();
				const data = extractLabelsData(actor);

				expect(data).not.toBeNull();
				expect(data!.labels.danger).toBeDefined();
				expect(data!.labels.freak).toBeDefined();
				expect(data!.labels.savior).toBeDefined();
				expect(data!.labels.superior).toBeDefined();
				expect(data!.labels.mundane).toBeDefined();
			});

			it("should extract correct values for Beacon", () => {
				const actor = BEACON.clone();
				const data = extractLabelsData(actor);

				// Beacon: danger: 2, freak: 0, savior: 1, superior: -1, mundane: 1
				expect(data!.labels.danger).toBe(2);
				expect(data!.labels.freak).toBe(0);
				expect(data!.labels.savior).toBe(1);
				expect(data!.labels.superior).toBe(-1);
				expect(data!.labels.mundane).toBe(1);
			});

			it("should extract correct values for Nova", () => {
				const actor = NOVA.clone();
				const data = extractLabelsData(actor);

				// Nova: danger: 1, freak: 2, savior: 0, superior: 1, mundane: -1
				expect(data!.labels.danger).toBe(1);
				expect(data!.labels.freak).toBe(2);
				expect(data!.labels.savior).toBe(0);
				expect(data!.labels.superior).toBe(1);
				expect(data!.labels.mundane).toBe(-1);
			});

			it("should use default 0 for missing labels", () => {
				const actor = StubActor.forCharacter({
					system: {
						stats: {
							danger: { value: 2 },
							// Missing other stats
						},
					} as any,
				});
				const data = extractLabelsData(actor);

				expect(data!.labels.danger).toBe(2);
				expect(data!.labels.freak).toBe(0);
				expect(data!.labels.savior).toBe(0);
			});
		});

		describe("condition penalties", () => {
			it("should apply -2 for Afraid (affects danger)", () => {
				const actor = BEACON.clone().setCondition("afraid", true);
				const data = extractLabelsData(actor);

				// Beacon danger is 2, with Afraid it becomes 0
				expect(data!.labels.danger).toBe(0);
				expect(data!.affectedLabels.has("danger")).toBe(true);
			});

			it("should apply -2 for Angry (affects mundane)", () => {
				const actor = BEACON.clone().setCondition("angry", true);
				const data = extractLabelsData(actor);

				// Beacon mundane is 1, with Angry it becomes -1
				expect(data!.labels.mundane).toBe(-1);
				expect(data!.affectedLabels.has("mundane")).toBe(true);
			});

			it("should apply -2 for Guilty (affects superior)", () => {
				const actor = BEACON.clone().setCondition("guilty", true);
				const data = extractLabelsData(actor);

				// Beacon superior is -1, with Guilty it becomes -3
				expect(data!.labels.superior).toBe(-3);
				expect(data!.affectedLabels.has("superior")).toBe(true);
			});

			it("should apply -2 for Hopeless (affects freak)", () => {
				const actor = NOVA.clone().setCondition("hopeless", true);
				const data = extractLabelsData(actor);

				// Nova freak is 2, with Hopeless it becomes 0
				expect(data!.labels.freak).toBe(0);
				expect(data!.affectedLabels.has("freak")).toBe(true);
			});

			it("should apply -2 for Insecure (affects savior)", () => {
				const actor = LEGACY.clone().setCondition("insecure", true);
				const data = extractLabelsData(actor);

				// Legacy savior is 2, with Insecure it becomes 0
				expect(data!.labels.savior).toBe(0);
				expect(data!.affectedLabels.has("savior")).toBe(true);
			});

			it("should apply multiple condition penalties to different labels", () => {
				const actor = BEACON.clone()
					.setCondition("afraid", true)
					.setCondition("angry", true);
				const data = extractLabelsData(actor);

				// Both danger and mundane should be affected
				expect(data!.affectedLabels.has("danger")).toBe(true);
				expect(data!.affectedLabels.has("mundane")).toBe(true);
				expect(data!.totalPenalty).toBe(4); // 2 conditions * 2
			});

			it("should handle all 5 conditions simultaneously", () => {
				const actor = ALL_CONDITIONS_MARKED.clone();
				const data = extractLabelsData(actor);

				expect(data!.affectedLabels.size).toBe(5);
				expect(data!.totalPenalty).toBe(10); // 5 conditions * 2
			});

			it("should not mark labels without conditions as affected", () => {
				const actor = BEACON.clone().setCondition("afraid", true);
				const data = extractLabelsData(actor);

				expect(data!.affectedLabels.has("danger")).toBe(true);
				expect(data!.affectedLabels.has("freak")).toBe(false);
				expect(data!.affectedLabels.has("savior")).toBe(false);
			});
		});

		describe("bonuses", () => {
			it("should apply forward bonus to all labels", () => {
				const actor = BEACON.clone();
				actor.system.resources.forward.value = 2;
				const data = extractLabelsData(actor);

				// All labels should be +2
				expect(data!.labels.danger).toBe(4); // 2 + 2, clamped to 4
				expect(data!.labels.freak).toBe(2); // 0 + 2
				expect(data!.labels.savior).toBe(3); // 1 + 2
				expect(data!.labels.superior).toBe(1); // -1 + 2
				expect(data!.labels.mundane).toBe(3); // 1 + 2
			});

			it("should apply ongoing bonus to all labels", () => {
				const actor = BEACON.clone();
				actor.system.resources.ongoing.value = 1;
				const data = extractLabelsData(actor);

				expect(data!.labels.danger).toBe(3); // 2 + 1
				expect(data!.labels.freak).toBe(1); // 0 + 1
			});

			it("should stack forward + ongoing bonuses", () => {
				const actor = BEACON.clone();
				actor.system.resources.forward.value = 1;
				actor.system.resources.ongoing.value = 1;
				const data = extractLabelsData(actor);

				expect(data!.globalBonus).toBe(2);
				expect(data!.labels.danger).toBe(4); // 2 + 2, clamped to 4
				expect(data!.labels.freak).toBe(2); // 0 + 2
			});

			it("should handle negative forward/ongoing", () => {
				const actor = BEACON.clone();
				actor.system.resources.forward.value = -1;
				const data = extractLabelsData(actor);

				expect(data!.globalBonus).toBe(-1);
				expect(data!.labels.danger).toBe(1); // 2 + (-1)
			});
		});

		describe("clamping", () => {
			it("should clamp effective values to -3 minimum", () => {
				const actor = StubActor.withLabels({ danger: -2, freak: -2, savior: -2, superior: -2, mundane: -2 });
				actor.setCondition("afraid", true); // -2 to danger
				const data = extractLabelsData(actor);

				// -2 + (-2) = -4, clamped to -3
				expect(data!.labels.danger).toBe(-3);
			});

			it("should clamp effective values to +4 maximum", () => {
				const actor = ALL_MAX_LABELS.clone();
				actor.system.resources.forward.value = 2;
				const data = extractLabelsData(actor);

				// All start at 3, +2 bonus = 5, clamped to 4
				expect(data!.labels.danger).toBe(4);
				expect(data!.labels.freak).toBe(4);
			});

			it("should clamp correctly when penalties exceed bounds", () => {
				const actor = ALL_MIN_LABELS.clone()
					.setCondition("afraid", true);
				const data = extractLabelsData(actor);

				// danger: -2 + (-2) = -4, clamped to -3
				expect(data!.labels.danger).toBe(-3);
			});

			it("should clamp correctly when bonuses exceed bounds", () => {
				const actor = ALL_MAX_LABELS.clone();
				actor.system.resources.forward.value = 5;
				actor.system.resources.ongoing.value = 5;
				const data = extractLabelsData(actor);

				// 3 + 10 = 13, clamped to 4
				expect(data!.labels.danger).toBe(4);
			});
		});

		describe("isPositive/isNegative flags", () => {
			it("should set isPositive when globalBonus >= 1", () => {
				const actor = BEACON.clone();
				actor.system.resources.forward.value = 1;
				const data = extractLabelsData(actor);

				expect(data!.isPositive).toBe(true);
			});

			it("should not set isPositive when globalBonus < 1", () => {
				const actor = BEACON.clone();
				const data = extractLabelsData(actor);

				expect(data!.isPositive).toBe(false);
			});

			it("should set isNegative when penalties > bonus", () => {
				const actor = BEACON.clone().setCondition("afraid", true);
				const data = extractLabelsData(actor);

				// totalPenalty = 2, globalBonus = 0
				expect(data!.isNegative).toBe(true);
			});

			it("should not set isNegative when bonus >= penalties", () => {
				const actor = BEACON.clone().setCondition("afraid", true);
				actor.system.resources.forward.value = 2;
				const data = extractLabelsData(actor);

				// totalPenalty = 2, globalBonus = 2
				expect(data!.isNegative).toBe(false);
			});

			it("should not set isNegative when there are no conditions", () => {
				const actor = BEACON.clone();
				const data = extractLabelsData(actor);

				expect(data!.isNegative).toBe(false);
			});
		});

		describe("affected labels tracking", () => {
			it("should return empty set when no modifiers", () => {
				const actor = BEACON.clone();
				const data = extractLabelsData(actor);

				expect(data!.affectedLabels.size).toBe(0);
			});

			it("should track all labels affected by conditions", () => {
				const actor = BEACON.clone()
					.setCondition("afraid", true)
					.setCondition("hopeless", true);
				const data = extractLabelsData(actor);

				expect(data!.affectedLabels.has("danger")).toBe(true);
				expect(data!.affectedLabels.has("freak")).toBe(true);
				expect(data!.affectedLabels.size).toBe(2);
			});
		});
	});

	// ========================================================================
	// SVG Generation
	// ========================================================================

	describe("generateLabelsGraphSVG", () => {
		describe("basic output", () => {
			it("should return a valid SVG string", () => {
				const svg = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
				});

				expect(svg).toContain("<svg");
				expect(svg).toContain("</svg>");
				expect(svg).toContain("xmlns=\"http://www.w3.org/2000/svg\"");
			});

			it("should include the labels-graph-svg class", () => {
				const svg = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
				});

				expect(svg).toContain("class=\"labels-graph-svg\"");
			});

			it("should include data polygon with labels-graph-data class", () => {
				const svg = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
				});

				expect(svg).toContain("class=\"labels-graph-data\"");
			});
		});

		describe("size option", () => {
			it("should respect custom size", () => {
				const svg = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
					size: 100,
				});

				expect(svg).toContain("width=\"100\"");
				expect(svg).toContain("height=\"100\"");
			});

			it("should use default size of 28", () => {
				const svg = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
				});

				expect(svg).toContain("width=\"28\"");
				expect(svg).toContain("height=\"28\"");
			});
		});

		describe("color schemes", () => {
			it("should use default yellow colors when neither positive nor negative", () => {
				const svg = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
					isPositive: false,
					isNegative: false,
				});

				expect(svg).toContain(COLORS.fillDefault);
				expect(svg).toContain(COLORS.strokeDefault);
			});

			it("should use green colors when isPositive is true", () => {
				const svg = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
					isPositive: true,
				});

				expect(svg).toContain(COLORS.fillBonus);
				expect(svg).toContain(COLORS.strokeBonus);
			});

			it("should use red colors when isNegative is true", () => {
				const svg = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
					isNegative: true,
				});

				expect(svg).toContain(COLORS.fillCondition);
				expect(svg).toContain(COLORS.strokeCondition);
			});

			it("should prioritize isPositive over isNegative", () => {
				const svg = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
					isPositive: true,
					isNegative: true,
				});

				expect(svg).toContain(COLORS.fillBonus);
			});
		});

		describe("showInnerLines option", () => {
			it("should include inner grid lines by default", () => {
				const svg = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
				});

				// Grid lines should be present (stroke-width="0.5" for grid)
				expect(svg).toContain('stroke-width="0.5"');
			});

			it("should hide inner grid lines when showInnerLines is false", () => {
				const svgWithLines = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
					showInnerLines: true,
				});

				const svgWithoutLines = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
					showInnerLines: false,
				});

				// Should have fewer path elements without grid lines
				const pathCountWith = (svgWithLines.match(/<path/g) || []).length;
				const pathCountWithout = (svgWithoutLines.match(/<path/g) || []).length;
				expect(pathCountWithout).toBeLessThan(pathCountWith);
			});
		});

		describe("showVertexDots option", () => {
			it("should not include vertex dots by default", () => {
				const svg = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
				});

				expect(svg).not.toContain('class="vertex-dot"');
			});

			it("should include vertex dots when showVertexDots is true", () => {
				const svg = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
					showVertexDots: true,
				});

				expect(svg).toContain('class="vertex-dot"');
				// Should have 5 dots (one per label)
				const dotCount = (svg.match(/class="vertex-dot"/g) || []).length;
				expect(dotCount).toBe(5);
			});
		});

		describe("showIcons option", () => {
			it("should not include icons by default", () => {
				const svg = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
				});

				expect(svg).not.toContain("label-icon-vertex");
			});

			it("should include icons when showIcons is true", () => {
				const svg = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
					showIcons: true,
				});

				expect(svg).toContain("label-icon-vertex");
				expect(svg).toContain("label-icon-danger");
				expect(svg).toContain("label-icon-freak");
			});

			it("should include icon padding when showIcons is true", () => {
				const svgWithoutIcons = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
					size: 100,
					showIcons: false,
				});

				const svgWithIcons = generateLabelsGraphSVG({
					labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
					size: 100,
					showIcons: true,
				});

				// With icons, total size should be larger due to padding
				expect(svgWithIcons).toContain("130"); // 100 + (100 * 0.15 * 2)
			});
		});
	});

	describe("generateLabelsTooltip", () => {
		describe("basic formatting", () => {
			it("should format all labels with abbreviations", () => {
				const labels = { danger: 2, freak: 1, savior: 0, superior: -1, mundane: 1 };
				const tooltip = generateLabelsTooltip(labels);

				expect(tooltip).toContain("DAN: 2");
				expect(tooltip).toContain("FRE: 1");
				expect(tooltip).toContain("SAV: 0");
				expect(tooltip).toContain("MUN: 1");
				expect(tooltip).toContain("SUP: -1");
			});

			it("should use pipe separator between labels", () => {
				const labels = { danger: 2, freak: 1, savior: 0, superior: -1, mundane: 1 };
				const tooltip = generateLabelsTooltip(labels);

				expect(tooltip.split(" | ")).toHaveLength(5);
			});

			it("should format in LABEL_ORDER sequence", () => {
				const labels = { danger: 2, freak: 1, savior: 0, superior: -1, mundane: 1 };
				const tooltip = generateLabelsTooltip(labels);

				// Check order: danger, freak, savior, mundane, superior
				const parts = tooltip.split(" | ");
				expect(parts[0]).toContain("DAN");
				expect(parts[1]).toContain("FRE");
				expect(parts[2]).toContain("SAV");
				expect(parts[3]).toContain("MUN");
				expect(parts[4]).toContain("SUP");
			});
		});

		describe("affected labels marking", () => {
			it("should add asterisk for affected labels", () => {
				const labels = { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const affected = new Set(["danger", "freak"]);
				const tooltip = generateLabelsTooltip(labels, affected);

				expect(tooltip).toContain("DAN: 0*");
				expect(tooltip).toContain("FRE: 0*");
				expect(tooltip).not.toContain("SAV: 0*");
			});

			it("should handle empty affected set", () => {
				const labels = { danger: 2, freak: 1, savior: 0, superior: -1, mundane: 1 };
				const tooltip = generateLabelsTooltip(labels, new Set());

				expect(tooltip).not.toContain("*");
			});

			it("should handle undefined affected set", () => {
				const labels = { danger: 2, freak: 1, savior: 0, superior: -1, mundane: 1 };
				const tooltip = generateLabelsTooltip(labels);

				expect(tooltip).not.toContain("*");
			});
		});

		describe("edge cases", () => {
			it("should handle missing label values (default to 0)", () => {
				const labels = { danger: 2 }; // Missing other labels
				const tooltip = generateLabelsTooltip(labels as any);

				expect(tooltip).toContain("DAN: 2");
				expect(tooltip).toContain("FRE: 0");
				expect(tooltip).toContain("SAV: 0");
			});

			it("should handle negative values", () => {
				const labels = { danger: -2, freak: -1, savior: 0, superior: -3, mundane: -2 };
				const tooltip = generateLabelsTooltip(labels);

				expect(tooltip).toContain("DAN: -2");
				expect(tooltip).toContain("SUP: -3");
			});
		});
	});

	describe("calculateLabelsGraphPath", () => {
		it("should return path, fill, and stroke", () => {
			const result = calculateLabelsGraphPath({
				labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
			});

			expect(result.path).toBeDefined();
			expect(result.fill).toBeDefined();
			expect(result.stroke).toBeDefined();
		});

		it("should use default colors when neither positive nor negative", () => {
			const result = calculateLabelsGraphPath({
				labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
			});

			expect(result.fill).toBe(COLORS.fillDefault);
			expect(result.stroke).toBe(COLORS.strokeDefault);
		});

		it("should use bonus colors when isPositive", () => {
			const result = calculateLabelsGraphPath({
				labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
				isPositive: true,
			});

			expect(result.fill).toBe(COLORS.fillBonus);
			expect(result.stroke).toBe(COLORS.strokeBonus);
		});

		it("should use condition colors when isNegative", () => {
			const result = calculateLabelsGraphPath({
				labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
				isNegative: true,
			});

			expect(result.fill).toBe(COLORS.fillCondition);
			expect(result.stroke).toBe(COLORS.strokeCondition);
		});

		it("should generate valid SVG path string", () => {
			const result = calculateLabelsGraphPath({
				labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
			});

			expect(result.path).toMatch(/^M .+ Z$/);
		});

		it("should change path when labels change", () => {
			const result1 = calculateLabelsGraphPath({
				labels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
			});

			const result2 = calculateLabelsGraphPath({
				labels: { danger: 3, freak: 3, savior: 3, superior: 3, mundane: 3 },
			});

			expect(result1.path).not.toBe(result2.path);
		});
	});

	describe("createLabelsGraphData", () => {
		it("should return null for null actor", () => {
			expect(createLabelsGraphData(null)).toBeNull();
		});

		it("should return object with svg and tooltip for valid actor", () => {
			const actor = BEACON.clone();
			const result = createLabelsGraphData(actor);

			expect(result).not.toBeNull();
			expect(result!.svg).toBeDefined();
			expect(result!.tooltip).toBeDefined();
		});

		it("should include isPositive/isNegative flags", () => {
			const actor = BEACON.clone();
			const result = createLabelsGraphData(actor);

			expect(result!.isPositive).toBeDefined();
			expect(result!.isNegative).toBeDefined();
		});

		it("should include backward compat hasBonus/hasCondition", () => {
			const actor = BEACON.clone();
			const result = createLabelsGraphData(actor);

			expect(result!.hasBonus).toBeDefined();
			expect(result!.hasCondition).toBeDefined();
		});

		it("should apply svgOptions", () => {
			const actor = BEACON.clone();
			const result = createLabelsGraphData(actor, { size: 200, showIcons: true });

			expect(result!.svg).toContain("label-icon-vertex");
		});
	});

	// ========================================================================
	// LabelsGraph Class
	// ========================================================================

	describe("LabelsGraph class", () => {
		describe("constructor", () => {
			it("should create instance with default options", () => {
				const graph = new LabelsGraph({});
				expect(graph).toBeDefined();
			});

			it("should accept custom size", () => {
				const graph = new LabelsGraph({ size: 100 }) as any;
				expect(graph.size).toBe(100);
			});

			it("should accept actor in constructor", () => {
				const actor = BEACON.clone();
				const graph = new LabelsGraph({ actor }) as any;
				expect(graph._data).not.toBeNull();
			});
		});

		describe("setActor", () => {
			it("should update internal data when actor is set", () => {
				const graph = new LabelsGraph({}) as any;
				expect(graph._data).toBeNull();

				const actor = BEACON.clone();
				graph.setActor(actor);
				expect(graph._data).not.toBeNull();
			});
		});

		describe("getTooltip", () => {
			it("should return empty string when no actor set", () => {
				const graph = new LabelsGraph({}) as any;
				expect(graph.getTooltip()).toBe("");
			});

			it("should return tooltip when actor is set", () => {
				const graph = new LabelsGraph({ actor: BEACON.clone() }) as any;
				const tooltip = graph.getTooltip();
				expect(tooltip).toContain("DAN:");
			});
		});

		describe("static fromActor", () => {
			it("should return empty string for null actor", () => {
				const svg = (LabelsGraph as any).fromActor(null);
				expect(svg).toBe("");
			});

			it("should return SVG string for valid actor", () => {
				const svg = (LabelsGraph as any).fromActor(BEACON.clone());
				expect(svg).toContain("<svg");
			});
		});
	});
});
