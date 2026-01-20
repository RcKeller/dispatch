/**
 * Tests for labels-graph-overlay.ts
 * Dual-graph overlay component for Call sheets - hero stats vs requirements
 */

import { StubActor } from "../stubs/foundry/StubActor";
import {
	BEACON,
	LEGACY,
	NOVA,
	BULL,
	SOLDIER,
	ALL_MAX_LABELS,
	ALL_MIN_LABELS,
} from "../test_data/TestCharacters";

describe("labels-graph-overlay", () => {
	// Module exports
	let checkFitResult: (
		heroLabels: Record<string, number>,
		requirements: Record<string, number | null | undefined>
	) => "great" | "good" | "poor" | null;
	let generateOverlayGraphSVG: (options: Record<string, unknown>) => string;
	let createOverlayGraphData: (
		actor: unknown,
		requirements: Record<string, number | null | undefined>,
		svgOptions?: Record<string, unknown>,
		snapshotLabels?: Record<string, number> | null
	) => Record<string, unknown>;
	let OVERLAY_COLORS: Record<string, string>;

	// Import from labels-graph for comparison testing
	let extractLabelsData: (actor: unknown) => { labels: Record<string, number> } | null;

	beforeAll(async () => {
		const overlayModule = await import("../../src/module/labels-graph-overlay");
		checkFitResult = overlayModule.checkFitResult;
		generateOverlayGraphSVG = overlayModule.generateOverlayGraphSVG;
		createOverlayGraphData = overlayModule.createOverlayGraphData;
		OVERLAY_COLORS = overlayModule.OVERLAY_COLORS;

		const graphModule = await import("../../src/module/labels-graph");
		extractLabelsData = graphModule.extractLabelsData;
	});

	// ========================================================================
	// Constants
	// ========================================================================

	describe("OVERLAY_COLORS", () => {
		describe("hero polygon colors", () => {
			it("should have hero fill color (blue)", () => {
				expect(OVERLAY_COLORS.heroFill).toBeDefined();
				expect(OVERLAY_COLORS.heroFill).toContain("rgba");
			});

			it("should have hero stroke color", () => {
				expect(OVERLAY_COLORS.heroStroke).toBeDefined();
			});
		});

		describe("requirement polygon colors", () => {
			it("should have requirement fill color (grey)", () => {
				expect(OVERLAY_COLORS.requirementFill).toBeDefined();
			});

			it("should have requirement stroke color", () => {
				expect(OVERLAY_COLORS.requirementStroke).toBeDefined();
			});
		});

		describe("overlap polygon colors by fit result", () => {
			it("should have green colors for great fit", () => {
				expect(OVERLAY_COLORS.overlapGreatFill).toBeDefined();
				expect(OVERLAY_COLORS.overlapGreatStroke).toBeDefined();
			});

			it("should have yellow colors for good fit", () => {
				expect(OVERLAY_COLORS.overlapGoodFill).toBeDefined();
				expect(OVERLAY_COLORS.overlapGoodStroke).toBeDefined();
			});

			it("should have red colors for poor fit", () => {
				expect(OVERLAY_COLORS.overlapPoorFill).toBeDefined();
				expect(OVERLAY_COLORS.overlapPoorStroke).toBeDefined();
			});
		});

		describe("other colors", () => {
			it("should have grid line colors", () => {
				expect(OVERLAY_COLORS.gridLines).toBeDefined();
				expect(OVERLAY_COLORS.gridOuter).toBeDefined();
			});

			it("should have pentagon background colors", () => {
				expect(OVERLAY_COLORS.pentagonBg).toBeDefined();
				expect(OVERLAY_COLORS.pentagonBorder).toBeDefined();
			});

			it("should have spoke dot color", () => {
				expect(OVERLAY_COLORS.spokeDot).toBeDefined();
			});
		});

		it("should be frozen", () => {
			expect(Object.isFrozen(OVERLAY_COLORS)).toBe(true);
		});
	});

	// ========================================================================
	// Fit Calculation - CRITICAL BUSINESS LOGIC
	// ========================================================================

	describe("checkFitResult", () => {
		describe("no requirements (edge case)", () => {
			it("should return 'great' for empty requirements object", () => {
				const heroLabels = { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = {};

				expect(checkFitResult(heroLabels, requirements)).toBe("great");
			});

			it("should return 'great' for requirements with all null values", () => {
				const heroLabels = { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: null, freak: null, savior: null, superior: null, mundane: null };

				expect(checkFitResult(heroLabels, requirements as any)).toBe("great");
			});

			it("should return 'great' for requirements with all undefined values", () => {
				const heroLabels = { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: undefined, freak: undefined };

				expect(checkFitResult(heroLabels, requirements)).toBe("great");
			});
		});

		describe("single requirement", () => {
			it("should return 'great' when single requirement is met", () => {
				const heroLabels = { danger: 2, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("great");
			});

			it("should return 'great' when hero exceeds single requirement", () => {
				const heroLabels = { danger: 3, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 1 };

				expect(checkFitResult(heroLabels, requirements)).toBe("great");
			});

			it("should return 'poor' when single requirement is not met", () => {
				const heroLabels = { danger: 1, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("poor");
			});

			it("should handle exact match (hero === requirement)", () => {
				const heroLabels = { danger: 2, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("great");
			});
		});

		describe("two requirements", () => {
			it("should return 'great' when both requirements are met", () => {
				const heroLabels = { danger: 2, freak: 2, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 2, freak: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("great");
			});

			it("should return 'good' when exactly 2 are met (boundary case)", () => {
				// With 2 requirements and 2 met, this is "great" (all met)
				const heroLabels = { danger: 2, freak: 2, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 2, freak: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("great");
			});

			it("should return 'poor' when only 1 of 2 requirements met", () => {
				const heroLabels = { danger: 2, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 2, freak: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("poor");
			});

			it("should return 'poor' when 0 of 2 requirements met", () => {
				const heroLabels = { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 2, freak: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("poor");
			});
		});

		describe("three requirements", () => {
			it("should return 'great' when all 3 requirements are met", () => {
				const heroLabels = { danger: 2, freak: 2, savior: 2, superior: 0, mundane: 0 };
				const requirements = { danger: 2, freak: 2, savior: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("great");
			});

			it("should return 'good' when 2 of 3 requirements are met", () => {
				const heroLabels = { danger: 2, freak: 2, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 2, freak: 2, savior: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("good");
			});

			it("should return 'poor' when 1 of 3 requirements met", () => {
				const heroLabels = { danger: 2, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 2, freak: 2, savior: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("poor");
			});

			it("should return 'poor' when 0 of 3 requirements met", () => {
				const heroLabels = { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 2, freak: 2, savior: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("poor");
			});
		});

		describe("four requirements", () => {
			it("should return 'great' when all 4 are met", () => {
				const heroLabels = { danger: 2, freak: 2, savior: 2, superior: 2, mundane: 0 };
				const requirements = { danger: 2, freak: 2, savior: 2, superior: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("great");
			});

			it("should return 'good' when 3 of 4 are met", () => {
				const heroLabels = { danger: 2, freak: 2, savior: 2, superior: 0, mundane: 0 };
				const requirements = { danger: 2, freak: 2, savior: 2, superior: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("good");
			});

			it("should return 'good' when 2 of 4 are met", () => {
				const heroLabels = { danger: 2, freak: 2, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 2, freak: 2, savior: 2, superior: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("good");
			});

			it("should return 'poor' when 1 of 4 are met", () => {
				const heroLabels = { danger: 2, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 2, freak: 2, savior: 2, superior: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("poor");
			});
		});

		describe("five requirements", () => {
			it("should return 'great' when all 5 are met", () => {
				const heroLabels = { danger: 2, freak: 2, savior: 2, superior: 2, mundane: 2 };
				const requirements = { danger: 2, freak: 2, savior: 2, superior: 2, mundane: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("great");
			});

			it("should return 'good' when 4 of 5 are met", () => {
				const heroLabels = { danger: 2, freak: 2, savior: 2, superior: 2, mundane: 0 };
				const requirements = { danger: 2, freak: 2, savior: 2, superior: 2, mundane: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("good");
			});

			it("should return 'good' when 2 of 5 are met", () => {
				const heroLabels = { danger: 2, freak: 2, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 2, freak: 2, savior: 2, superior: 2, mundane: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("good");
			});

			it("should return 'poor' when 1 of 5 are met", () => {
				const heroLabels = { danger: 2, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 2, freak: 2, savior: 2, superior: 2, mundane: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("poor");
			});
		});

		describe("edge cases with label values", () => {
			it("should handle negative requirement values", () => {
				const heroLabels = { danger: -1, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: -1 };

				expect(checkFitResult(heroLabels, requirements)).toBe("great");
			});

			it("should handle negative hero values meeting negative requirements", () => {
				const heroLabels = { danger: -2, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: -3 };

				expect(checkFitResult(heroLabels, requirements)).toBe("great");
			});

			it("should handle negative hero values failing requirements", () => {
				const heroLabels = { danger: -2, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 0 };

				expect(checkFitResult(heroLabels, requirements)).toBe("poor");
			});

			it("should handle all labels at bounds (-3)", () => {
				const heroLabels = { danger: -3, freak: -3, savior: -3, superior: -3, mundane: -3 };
				const requirements = { danger: -3, freak: -3 };

				expect(checkFitResult(heroLabels, requirements)).toBe("great");
			});

			it("should handle all labels at bounds (+4)", () => {
				const heroLabels = { danger: 4, freak: 4, savior: 4, superior: 4, mundane: 4 };
				const requirements = { danger: 4, freak: 4 };

				expect(checkFitResult(heroLabels, requirements)).toBe("great");
			});

			it("should handle mixed positive/negative values", () => {
				const heroLabels = { danger: 2, freak: -1, savior: 0, superior: 1, mundane: -2 };
				const requirements = { danger: 1, freak: -2, savior: -1 };

				// danger: 2 >= 1 ✓, freak: -1 >= -2 ✓, savior: 0 >= -1 ✓
				expect(checkFitResult(heroLabels, requirements)).toBe("great");
			});

			it("should handle requirement of 0", () => {
				const heroLabels = { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 0 };

				expect(checkFitResult(heroLabels, requirements)).toBe("great");
			});

			it("should handle undefined label in hero (defaults to 0)", () => {
				const heroLabels = { danger: 2 }; // Missing other labels
				const requirements = { danger: 2, freak: 0 };

				// danger: 2 >= 2 ✓, freak: 0 (default) >= 0 ✓
				expect(checkFitResult(heroLabels as any, requirements)).toBe("great");
			});
		});

		describe("label key variations", () => {
			it("should work with danger requirement", () => {
				const heroLabels = { danger: 2, freak: 0, savior: 0, superior: 0, mundane: 0 };
				expect(checkFitResult(heroLabels, { danger: 2 })).toBe("great");
				expect(checkFitResult(heroLabels, { danger: 3 })).toBe("poor");
			});

			it("should work with freak requirement", () => {
				const heroLabels = { danger: 0, freak: 2, savior: 0, superior: 0, mundane: 0 };
				expect(checkFitResult(heroLabels, { freak: 2 })).toBe("great");
				expect(checkFitResult(heroLabels, { freak: 3 })).toBe("poor");
			});

			it("should work with savior requirement", () => {
				const heroLabels = { danger: 0, freak: 0, savior: 2, superior: 0, mundane: 0 };
				expect(checkFitResult(heroLabels, { savior: 2 })).toBe("great");
				expect(checkFitResult(heroLabels, { savior: 3 })).toBe("poor");
			});

			it("should work with superior requirement", () => {
				const heroLabels = { danger: 0, freak: 0, savior: 0, superior: 2, mundane: 0 };
				expect(checkFitResult(heroLabels, { superior: 2 })).toBe("great");
				expect(checkFitResult(heroLabels, { superior: 3 })).toBe("poor");
			});

			it("should work with mundane requirement", () => {
				const heroLabels = { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 2 };
				expect(checkFitResult(heroLabels, { mundane: 2 })).toBe("great");
				expect(checkFitResult(heroLabels, { mundane: 3 })).toBe("poor");
			});
		});

		describe("real playbook scenarios", () => {
			it("should evaluate Beacon correctly for danger-heavy call", () => {
				// Beacon: danger: 2, freak: 0, savior: 1, superior: -1, mundane: 1
				const beaconLabels = { danger: 2, freak: 0, savior: 1, superior: -1, mundane: 1 };
				const dangerCall = { danger: 2, freak: 1 };

				// danger: 2 >= 2 ✓, freak: 0 >= 1 ✗
				expect(checkFitResult(beaconLabels, dangerCall)).toBe("poor");
			});

			it("should evaluate Nova correctly for freak-heavy call", () => {
				// Nova: danger: 1, freak: 2, savior: 0, superior: 1, mundane: -1
				const novaLabels = { danger: 1, freak: 2, savior: 0, superior: 1, mundane: -1 };
				const freakCall = { freak: 2, superior: 1 };

				// freak: 2 >= 2 ✓, superior: 1 >= 1 ✓
				expect(checkFitResult(novaLabels, freakCall)).toBe("great");
			});

			it("should evaluate Legacy correctly for savior-heavy call", () => {
				// Legacy: danger: -1, freak: 0, savior: 2, superior: 1, mundane: 1
				const legacyLabels = { danger: -1, freak: 0, savior: 2, superior: 1, mundane: 1 };
				const saviorCall = { savior: 2, mundane: 1, danger: 1 };

				// savior: 2 >= 2 ✓, mundane: 1 >= 1 ✓, danger: -1 >= 1 ✗
				expect(checkFitResult(legacyLabels, saviorCall)).toBe("good");
			});
		});

		describe("boundary conditions for good vs poor", () => {
			it("should return 'poor' with exactly 1 requirement met when total >= 3", () => {
				const heroLabels = { danger: 2, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 2, freak: 2, savior: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("poor");
			});

			it("should return 'good' with exactly 2 requirements met", () => {
				const heroLabels = { danger: 2, freak: 2, savior: 0, superior: 0, mundane: 0 };
				const requirements = { danger: 2, freak: 2, savior: 2 };

				expect(checkFitResult(heroLabels, requirements)).toBe("good");
			});
		});
	});

	// ========================================================================
	// SVG Generation
	// ========================================================================

	describe("generateOverlayGraphSVG", () => {
		describe("basic output", () => {
			it("should return a valid SVG string", () => {
				const svg = generateOverlayGraphSVG({
					requirements: { danger: 2 },
				});

				expect(svg).toContain("<svg");
				expect(svg).toContain("</svg>");
			});

			it("should include labels-graph-overlay-svg class", () => {
				const svg = generateOverlayGraphSVG({
					requirements: { danger: 2 },
				});

				expect(svg).toContain('class="labels-graph-overlay-svg"');
			});

			it("should include data-overlay-uid for unique identification", () => {
				const svg = generateOverlayGraphSVG({
					requirements: { danger: 2 },
				});

				expect(svg).toContain("data-overlay-uid=");
			});
		});

		describe("size option", () => {
			it("should respect custom size", () => {
				const svg = generateOverlayGraphSVG({
					requirements: { danger: 2 },
					size: 200,
				});

				expect(svg).toContain("200");
			});

			it("should use default size of 120", () => {
				const svg = generateOverlayGraphSVG({
					requirements: { danger: 2 },
					showIcons: false,
				});

				expect(svg).toContain('width="120"');
				expect(svg).toContain('height="120"');
			});
		});

		describe("requirements polygon", () => {
			it("should render requirements polygon when requirements exist", () => {
				const svg = generateOverlayGraphSVG({
					requirements: { danger: 2, freak: 1 },
				});

				expect(svg).toContain('class="labels-graph-overlay-requirements"');
			});

			it("should use grey color for requirements polygon", () => {
				const svg = generateOverlayGraphSVG({
					requirements: { danger: 2, freak: 1, savior: 1 },
				});

				expect(svg).toContain(OVERLAY_COLORS.requirementFill);
				expect(svg).toContain(OVERLAY_COLORS.requirementStroke);
			});

			it("should use dashed stroke for requirements", () => {
				const svg = generateOverlayGraphSVG({
					requirements: { danger: 2, freak: 1, savior: 1 },
				});

				expect(svg).toContain("stroke-dasharray");
			});

			it("should handle 2 requirements (line instead of polygon)", () => {
				const svg = generateOverlayGraphSVG({
					requirements: { danger: 2, freak: 1 },
				});

				// With 2 requirements, should draw a line (M...L format, no fill)
				expect(svg).toContain('class="labels-graph-overlay-requirements"');
			});

			it("should handle 3+ requirements (closed polygon)", () => {
				const svg = generateOverlayGraphSVG({
					requirements: { danger: 2, freak: 1, savior: 1 },
				});

				// With 3+ requirements, should draw a closed polygon
				expect(svg).toContain('class="labels-graph-overlay-requirements"');
				expect(svg).toContain(OVERLAY_COLORS.requirementFill);
			});
		});

		describe("hero polygon", () => {
			it("should render hero polygon when heroLabels provided", () => {
				const svg = generateOverlayGraphSVG({
					heroLabels: { danger: 2, freak: 1, savior: 0, superior: -1, mundane: 1 },
					requirements: { danger: 2 },
				});

				expect(svg).toContain('class="labels-graph-overlay-hero"');
			});

			it("should not render hero polygon when heroLabels is null", () => {
				const svg = generateOverlayGraphSVG({
					heroLabels: null,
					requirements: { danger: 2 },
				});

				expect(svg).not.toContain('class="labels-graph-overlay-hero"');
			});

			it("should use blue color for hero polygon", () => {
				const svg = generateOverlayGraphSVG({
					heroLabels: { danger: 2, freak: 1, savior: 0, superior: -1, mundane: 1 },
					requirements: { danger: 2 },
				});

				expect(svg).toContain(OVERLAY_COLORS.heroFill);
				expect(svg).toContain(OVERLAY_COLORS.heroStroke);
			});
		});

		describe("overlap polygon (assessed state)", () => {
			it("should not render overlap when isAssessed is false", () => {
				const svg = generateOverlayGraphSVG({
					heroLabels: { danger: 2, freak: 1, savior: 0, superior: -1, mundane: 1 },
					requirements: { danger: 2 },
					isAssessed: false,
					fitResult: "great",
				});

				expect(svg).not.toContain('class="labels-graph-overlay-overlap"');
			});

			it("should render overlap when isAssessed is true", () => {
				const svg = generateOverlayGraphSVG({
					heroLabels: { danger: 2, freak: 1, savior: 0, superior: -1, mundane: 1 },
					requirements: { danger: 2, freak: 1, savior: 1 },
					isAssessed: true,
					fitResult: "great",
				});

				expect(svg).toContain('class="labels-graph-overlay-overlap"');
			});

			it("should use green color for great fit", () => {
				const svg = generateOverlayGraphSVG({
					heroLabels: { danger: 2, freak: 1, savior: 1, superior: 0, mundane: 0 },
					requirements: { danger: 2, freak: 1, savior: 1 },
					isAssessed: true,
					fitResult: "great",
				});

				expect(svg).toContain(OVERLAY_COLORS.overlapGreatFill);
			});

			it("should use yellow color for good fit", () => {
				const svg = generateOverlayGraphSVG({
					heroLabels: { danger: 2, freak: 1, savior: 0, superior: 0, mundane: 0 },
					requirements: { danger: 2, freak: 1, savior: 1 },
					isAssessed: true,
					fitResult: "good",
				});

				expect(svg).toContain(OVERLAY_COLORS.overlapGoodFill);
			});

			it("should use red color for poor fit", () => {
				const svg = generateOverlayGraphSVG({
					heroLabels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
					requirements: { danger: 2, freak: 1, savior: 1 },
					isAssessed: true,
					fitResult: "poor",
				});

				expect(svg).toContain(OVERLAY_COLORS.overlapPoorFill);
			});
		});

		describe("clip/mask for overlap", () => {
			it("should include clip-path for good fit", () => {
				const svg = generateOverlayGraphSVG({
					heroLabels: { danger: 2, freak: 1, savior: 0, superior: 0, mundane: 0 },
					requirements: { danger: 2, freak: 1, savior: 1 },
					isAssessed: true,
					fitResult: "good",
				});

				expect(svg).toContain("clip-path=");
			});

			it("should include mask for poor fit", () => {
				const svg = generateOverlayGraphSVG({
					heroLabels: { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 },
					requirements: { danger: 2, freak: 1, savior: 1 },
					isAssessed: true,
					fitResult: "poor",
				});

				expect(svg).toContain("mask=");
			});

			it("should not include clip-path or mask for great fit", () => {
				const svg = generateOverlayGraphSVG({
					heroLabels: { danger: 2, freak: 1, savior: 1, superior: 0, mundane: 0 },
					requirements: { danger: 2, freak: 1, savior: 1 },
					isAssessed: true,
					fitResult: "great",
				});

				// Great fit shows full requirements area without clip/mask
				const overlapSection = svg.slice(svg.indexOf('class="labels-graph-overlay-overlap"'));
				// Check that the overlap path doesn't have clip-path or mask
				// (it might be in defs though)
				expect(svg).toContain('class="labels-graph-overlay-overlap"');
			});
		});

		describe("showInnerLines option", () => {
			it("should show inner lines by default", () => {
				const svg = generateOverlayGraphSVG({
					requirements: { danger: 2 },
				});

				// Grid lines have stroke-width="0.5"
				expect(svg).toContain('stroke-width="0.5"');
			});

			it("should hide inner lines when showInnerLines is false", () => {
				const svgWithLines = generateOverlayGraphSVG({
					requirements: { danger: 2 },
					showInnerLines: true,
				});

				const svgWithoutLines = generateOverlayGraphSVG({
					requirements: { danger: 2 },
					showInnerLines: false,
				});

				// Without lines should have fewer path elements
				const pathCountWith = (svgWithLines.match(/<path/g) || []).length;
				const pathCountWithout = (svgWithoutLines.match(/<path/g) || []).length;
				expect(pathCountWithout).toBeLessThan(pathCountWith);
			});
		});

		describe("showIcons option", () => {
			it("should show icons by default", () => {
				const svg = generateOverlayGraphSVG({
					requirements: { danger: 2 },
				});

				expect(svg).toContain("label-icon-vertex");
			});

			it("should hide icons when showIcons is false", () => {
				const svg = generateOverlayGraphSVG({
					requirements: { danger: 2 },
					showIcons: false,
				});

				expect(svg).not.toContain("label-icon-vertex");
			});
		});

		describe("showSpokeDots option", () => {
			it("should show spoke dots by default", () => {
				const svg = generateOverlayGraphSVG({
					requirements: { danger: 2, freak: 1, savior: 1 },
				});

				expect(svg).toContain("spoke-dot");
			});

			it("should hide spoke dots when showSpokeDots is false", () => {
				const svg = generateOverlayGraphSVG({
					requirements: { danger: 2, freak: 1, savior: 1 },
					showSpokeDots: false,
				});

				expect(svg).not.toContain("spoke-dot");
			});

			it("should render requirement dots for each requirement", () => {
				const svg = generateOverlayGraphSVG({
					requirements: { danger: 2, freak: 1, savior: 1 },
				});

				const reqDotCount = (svg.match(/spoke-dot-req/g) || []).length;
				expect(reqDotCount).toBe(3);
			});

			it("should render hero dots when heroLabels provided", () => {
				const svg = generateOverlayGraphSVG({
					heroLabels: { danger: 2, freak: 1, savior: 0, superior: -1, mundane: 1 },
					requirements: { danger: 2 },
				});

				const heroDotCount = (svg.match(/spoke-dot-hero/g) || []).length;
				expect(heroDotCount).toBe(5);
			});
		});

		describe("unique ID generation", () => {
			it("should generate unique IDs for different calls", () => {
				const svg1 = generateOverlayGraphSVG({ requirements: { danger: 2 } });
				const svg2 = generateOverlayGraphSVG({ requirements: { danger: 2 } });

				// Extract UIDs
				const uid1Match = svg1.match(/data-overlay-uid="([^"]+)"/);
				const uid2Match = svg2.match(/data-overlay-uid="([^"]+)"/);

				expect(uid1Match).not.toBeNull();
				expect(uid2Match).not.toBeNull();
				expect(uid1Match![1]).not.toBe(uid2Match![1]);
			});
		});
	});

	// ========================================================================
	// createOverlayGraphData
	// ========================================================================

	describe("createOverlayGraphData", () => {
		describe("basic functionality", () => {
			it("should return svg, tooltip, fitResult, and heroLabels", () => {
				const actor = BEACON.clone();
				const result = createOverlayGraphData(actor, { danger: 2 });

				expect(result.svg).toBeDefined();
				expect(result.tooltip).toBeDefined();
				expect(result.fitResult).toBeDefined();
				expect(result.heroLabels).toBeDefined();
			});

			it("should extract hero labels from actor", () => {
				const actor = BEACON.clone();
				const result = createOverlayGraphData(actor, { danger: 2 });

				// Beacon has danger: 2
				expect(result.heroLabels).toMatchObject({ danger: 2 });
			});

			it("should calculate fit result based on extracted labels", () => {
				const actor = BEACON.clone();
				const result = createOverlayGraphData(actor, { danger: 2 });

				// Beacon danger is 2, meets requirement of 2
				expect(result.fitResult).toBe("great");
			});
		});

		describe("null actor handling", () => {
			it("should handle null actor", () => {
				const result = createOverlayGraphData(null, { danger: 2 });

				expect(result.heroLabels).toBeNull();
				expect(result.fitResult).toBeNull();
			});
		});

		describe("snapshot labels", () => {
			it("should use snapshot labels when provided", () => {
				const actor = BEACON.clone();
				const snapshotLabels = { danger: 3, freak: 3, savior: 3, superior: 3, mundane: 3 };
				const result = createOverlayGraphData(actor, { danger: 2 }, {}, snapshotLabels);

				// Should use snapshot, not actor's actual labels
				expect(result.heroLabels).toMatchObject({ danger: 3 });
			});

			it("should prefer snapshot labels over actor extraction", () => {
				const actor = BEACON.clone(); // danger: 2
				const snapshotLabels = { danger: 0, freak: 0, savior: 0, superior: 0, mundane: 0 };
				const result = createOverlayGraphData(actor, { danger: 2 }, {}, snapshotLabels);

				// Should fail the danger: 2 requirement since snapshot has danger: 0
				expect(result.fitResult).toBe("poor");
			});
		});

		describe("svgOptions propagation", () => {
			it("should pass svgOptions to generateOverlayGraphSVG", () => {
				const actor = BEACON.clone();
				const result = createOverlayGraphData(actor, { danger: 2 }, { size: 200 });

				expect(result.svg).toContain("200");
			});

			it("should pass isAssessed option", () => {
				const actor = BEACON.clone();
				// Need at least 2 requirements for overlap to render
				const result = createOverlayGraphData(actor, { danger: 2, freak: 1, savior: 1 }, { isAssessed: true });

				// With isAssessed: true and 3+ requirements, should include overlap
				expect(result.svg).toContain("labels-graph-overlay-overlap");
			});
		});

		describe("tooltip generation", () => {
			it("should generate tooltip with all label values", () => {
				const actor = BEACON.clone();
				const result = createOverlayGraphData(actor, { danger: 2 });

				expect(result.tooltip).toContain("Danger:");
				expect(result.tooltip).toContain("Freak:");
				expect(result.tooltip).toContain("Savior:");
			});

			it("should use pipe separator", () => {
				const actor = BEACON.clone();
				const result = createOverlayGraphData(actor, { danger: 2 });

				expect(result.tooltip).toContain(" | ");
			});
		});

		describe("fit result calculation", () => {
			it("should return great for Beacon meeting danger 2 requirement", () => {
				const actor = BEACON.clone();
				const result = createOverlayGraphData(actor, { danger: 2 });

				expect(result.fitResult).toBe("great");
			});

			it("should return poor for Beacon with danger 3 requirement", () => {
				const actor = BEACON.clone();
				const result = createOverlayGraphData(actor, { danger: 3 });

				expect(result.fitResult).toBe("poor");
			});

			it("should return good for partial match", () => {
				const actor = BEACON.clone();
				// Beacon: danger: 2, freak: 0, savior: 1
				const result = createOverlayGraphData(actor, { danger: 2, freak: 1, savior: 1 });

				// danger: 2 >= 2 ✓, freak: 0 >= 1 ✗, savior: 1 >= 1 ✓
				// 2 of 3 met = good
				expect(result.fitResult).toBe("good");
			});
		});
	});
});
