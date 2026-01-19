// module/call-sheet.ts
// Call Actor Sheet - Dispatch-style vignette assignment UI
// Combines Masks labels with Dispatch's fit-check mechanic

import {
	createOverlayGraphData,
	updateOverlayGraphAnimated,
	checkFitResult,
	type CallRequirements,
	type FitResult,
} from "./labels-graph-overlay";
import { extractLabelsData, LABEL_ORDER, GRAPH_PRESETS } from "./labels-graph";
import { CooldownSystem, getTeamCombatants, getActiveCombat, isDowned } from "./turn-cards";
import { HookRegistry } from "./helpers/hook-registry";
import { MODULE_ID, MASKS_MODULE_ID, SOCKET_NS, TEMPLATES } from "../config";

// Use masks module ID for shared data (flags stored by masks)
const NS = MASKS_MODULE_ID;
const DISPATCH_NS = MODULE_ID;
const TEMPLATE = TEMPLATES.callSheet;

// Forward bounds (from turn-cards.ts)
const FORWARD_MIN = -1;
const FORWARD_MAX = 8;

/**
 * Call types (enum keywords inspired by Dispatch)
 */
export const CALL_TYPES = Object.freeze({
	assault: { key: "assault", label: "DISPATCH.Call.Types.assault", icon: "fa-solid fa-fist-raised" },
	rescue: { key: "rescue", label: "DISPATCH.Call.Types.rescue", icon: "fa-solid fa-life-ring" },
	investigation: { key: "investigation", label: "DISPATCH.Call.Types.investigation", icon: "fa-solid fa-magnifying-glass" },
	social: { key: "social", label: "DISPATCH.Call.Types.social", icon: "fa-solid fa-comments" },
	disaster: { key: "disaster", label: "DISPATCH.Call.Types.disaster", icon: "fa-solid fa-house-crack" },
	"minor-inconvenience": { key: "minor-inconvenience", label: "DISPATCH.Call.Types.minorInconvenience", icon: "fa-solid fa-mug-hot" },
	robbery: { key: "robbery", label: "DISPATCH.Call.Types.robbery", icon: "fa-solid fa-mask" },
	"honey-heist": { key: "honey-heist", label: "DISPATCH.Call.Types.honeyHeist", icon: "fa-solid fa-paw" },
	pursuit: { key: "pursuit", label: "DISPATCH.Call.Types.pursuit", icon: "fa-solid fa-person-running" },
});

/**
 * Dispatch status states
 */
export type DispatchStatus = "idle" | "assessing" | "qualified";

/**
 * Call sheet for the "Call" actor type
 * Top section is visible to all players
 * Bottom section is GM/owner-only
 */
export class CallSheet extends ActorSheet {
	/** @override */
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ["dispatch", "sheet", "call-sheet"],
			template: TEMPLATE,
			width: 900,
			height: 700,
			resizable: true,
			tabs: [],
			viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED,
			submitOnChange: false,
		});
	}

	_hoveredActorId: string | null = null;
	_previousGraphState: { heroPath: string; reqPath: string; overlapPath?: string } | null = null;
	_hooks: HookRegistry | null = null;
	_requirementDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	_cachedHeroLabels: Record<string, number> | null = null;
	_cachedRequirements: CallRequirements | null = null;
	_pendingHoverFrame: number | null = null;
	_hooksRegistered: boolean = false;
	_combatRenderTimer: ReturnType<typeof setTimeout> | null = null;

	/** @override */
	get title() {
		const callType = this.actor.getFlag(NS, "callType") ?? "assault";
		const typeConfig = CALL_TYPES[callType as keyof typeof CALL_TYPES];
		const typeName = game.i18n?.localize?.(typeConfig?.label ?? "DISPATCH.Call.Types.assault") ?? "Call";
		return `${typeName}: ${this.actor.name}`;
	}

	get isEditable(): boolean {
		return true;
	}

	/** @override */
	async getData() {
		const context = await super.getData();
		const isOwner = this.actor.isOwner;
		const isGM = game.user?.isGM ?? false;
		const hasLimitedPermission = this.actor.testUserPermission(game.user!, "LIMITED");
		const hasObserverPermission = this.actor.testUserPermission(game.user!, "OBSERVER");
		const canEdit = isOwner || isGM;
		const canInteract = true;

		const callType = this.actor.getFlag(NS, "callType") ?? "assault";
		const callerName = this.actor.getFlag(NS, "callerName") ?? "";
		const callerQuote = this.actor.getFlag(NS, "callerQuote") ?? "";
		const requirementsText = this.actor.getFlag(NS, "requirementsText") ?? "";

		const requirements: CallRequirements = this.actor.getFlag(NS, "requirements") ?? {};
		const assignedActorIds: string[] = this.actor.getFlag(NS, "assignedActorIds") ?? [];
		const dispatchStatus: DispatchStatus = this.actor.getFlag(NS, "dispatchStatus") ?? "idle";
		const fitResult: FitResult = this.actor.getFlag(NS, "fitResult") ?? null;
		const forwardChange: number | null = this.actor.getFlag(NS, "forwardChange") ?? null;
		const snapshotHeroLabels: Record<string, number> | null = this.actor.getFlag(NS, "snapshotHeroLabels") ?? null;

		let assignedActor: Actor | null = null;
		let previewActor: Actor | null = null;

		if (assignedActorIds.length > 0) {
			assignedActor = game.actors?.get(assignedActorIds[0]) ?? null;
		}

		if (this._hoveredActorId) {
			previewActor = game.actors?.get(this._hoveredActorId) ?? null;
		}

		const graphActor = previewActor ?? assignedActor;
		const heroData = graphActor ? extractLabelsData(graphActor) : null;
		const showRequirementsOverlay = isGM || dispatchStatus === "qualified";

		const overlayGraph = createOverlayGraphData(
			graphActor,
			showRequirementsOverlay ? requirements : {},
			{
				size: 280,
				borderWidth: 2.5,
				showInnerLines: true,
				showIcons: true,
				showSpokeDots: true,
				isAssessed: dispatchStatus === "qualified",
			},
			snapshotHeroLabels
		);

		const callTypeOptions = Object.entries(CALL_TYPES).map(([key, config]) => ({
			key,
			label: game.i18n?.localize?.(config.label) ?? key,
			icon: config.icon,
			selected: key === callType,
		}));

		const currentTypeConfig = CALL_TYPES[callType as keyof typeof CALL_TYPES] ?? CALL_TYPES.assault;

		const labelRows = LABEL_ORDER.map((key) => {
			const req = requirements[key as keyof CallRequirements];
			const heroValue = overlayGraph.heroLabels?.[key] ?? null;
			const hasHeroValue = heroValue !== null;
			const hasRequirement = req != null;
			const diff = hasHeroValue && hasRequirement ? heroValue - req : null;
			const met = !hasRequirement || (hasHeroValue && heroValue >= req);

			return {
				key,
				label: game.i18n?.localize?.(`DISPATCH.CharacterSheets.stats.${key}`) ?? key,
				requirement: req,
				hasRequirement,
				heroValue,
				hasHeroValue,
				diff,
				met,
			};
		});

		const activeCombat = getActiveCombat();
		const teamCombatants = activeCombat ? getTeamCombatants(activeCombat) : [];
		const teamSize = teamCombatants.length;
		const maxCd = CooldownSystem.maxCooldown(teamSize);

		const combatantByActorId = new Map(
			teamCombatants.map((c) => [c.actorId, c])
		);

		let noCombatWarning = false;

		interface HeroButton {
			id: string | null;
			name: string;
			selected: boolean;
			unavailable: boolean;
			unavailableReason: string;
			tooltip: string;
			cooldownRemaining: number;
			isDowned: boolean;
		}

		let heroButtons: HeroButton[] = [];

		if (!activeCombat) {
			noCombatWarning = true;
			heroButtons = [];
		} else {
			heroButtons = teamCombatants.map((cbt) => {
				const isSelected = assignedActorIds.includes(cbt.actorId ?? "");
				const heroIsDowned = isDowned(cbt);
				const cooldownRemaining = CooldownSystem.remaining(cbt, maxCd);
				const isOnCooldown = CooldownSystem.isOnCooldown(cbt, maxCd);

				let unavailable = false;
				let unavailableReason = "";
				let tooltip = cbt.actor?.name ?? "Unknown";

				if (heroIsDowned) {
					unavailable = true;
					unavailableReason = "Downed";
					tooltip = `${tooltip} (Downed)`;
				} else if (isOnCooldown) {
					unavailable = true;
					unavailableReason = `CD: ${cooldownRemaining}`;
					tooltip = `${tooltip} (Cooldown: ${cooldownRemaining} turns)`;
				} else {
					tooltip = `${tooltip} - Click to assign`;
				}

				return {
					id: cbt.actorId,
					name: cbt.actor?.name ?? "Unknown",
					selected: isSelected,
					unavailable,
					unavailableReason,
					tooltip,
					cooldownRemaining,
					isDowned: heroIsDowned,
				};
			});
		}

		const canDispatch = assignedActor !== null && dispatchStatus === "idle" && canInteract;
		const isAssessing = dispatchStatus === "assessing";
		const isQualified = dispatchStatus === "qualified";

		let fitClass = "";
		let fitLabel = "";
		if (isQualified && fitResult) {
			switch (fitResult) {
				case "great":
					fitClass = "fit--great";
					fitLabel = game.i18n?.localize?.("DISPATCH.Call.Fit.great") ?? "Great Fit";
					break;
				case "good":
					fitClass = "fit--decent";
					fitLabel = game.i18n?.localize?.("DISPATCH.Call.Fit.good") ?? "Good Fit";
					break;
				case "poor":
					fitClass = "fit--poor";
					fitLabel = game.i18n?.localize?.("DISPATCH.Call.Fit.poor") ?? "Poor Fit";
					break;
			}
		}

		let previewFitClass = "";
		let previewFitLabel = "";
		if (isGM && !isQualified && graphActor && heroData) {
			const previewFit = checkFitResult(heroData.labels, requirements);
			switch (previewFit) {
				case "great":
					previewFitClass = "preview-fit--great";
					previewFitLabel = "Great Fit";
					break;
				case "good":
					previewFitClass = "preview-fit--decent";
					previewFitLabel = "Decent Fit";
					break;
				case "poor":
					previewFitClass = "preview-fit--poor";
					previewFitLabel = "Poor Fit";
					break;
			}
		}

		let forwardMessage = "";
		if (forwardChange !== null && assignedActor) {
			const sign = forwardChange > 0 ? "+" : "";
			forwardMessage = `${assignedActor.name} takes ${sign}${forwardChange} Forward`;
		}

		this._cachedHeroLabels = overlayGraph.heroLabels;
		this._cachedRequirements = requirements;

		return {
			...context,
			isOwner,
			isGM,
			canEdit,
			canInteract,
			canSeeBottom: isGM,

			callType,
			callTypeOptions,
			currentTypeIcon: currentTypeConfig.icon,
			callerName,
			callerQuote,
			requirementsText,

			overlayGraph,

			assignedActorIds,
			assignedActor,
			previewActor,
			heroButtons,
			noCombatWarning,

			dispatchStatus,
			canDispatch,
			isAssessing,
			isQualified,
			fitResult,
			fitClass,
			fitLabel,
			forwardChange,
			forwardMessage,

			previewFitClass,
			previewFitLabel,

			labelRows,
			requirements,
		};
	}

	/** @override */
	activateListeners(html: JQuery) {
		super.activateListeners(html);

		html.on("change", "[data-action='change-call-type']", this._onChangeCallType.bind(this));
		html.on("change", "[data-action='change-caller-name']", this._onChangeCallerName.bind(this));
		html.on("change", "[data-action='change-caller-quote']", this._onChangeCallerQuote.bind(this));
		html.on("change", "[data-action='change-requirements-text']", this._onChangeRequirementsText.bind(this));
		html.on("change", "[data-action='change-requirement']", this._onChangeRequirement.bind(this));
		html.on("click", "[data-action='select-hero']", this._onSelectHero.bind(this));
		html.on("mouseenter", "[data-action='select-hero']", this._onHeroButtonEnter.bind(this));
		html.on("mouseleave", ".hero-button-group", this._onHeroGroupLeave.bind(this));
		html.on("click", "[data-action='dispatch']", this._onDispatch.bind(this));
		html.on("click", "[data-action='reset-call']", this._onResetCall.bind(this));
		html.on("click", "[data-action='reveal-fit']", this._onRevealFit.bind(this));
		html.on("click", "[data-action='show-to-everyone']", this._onShowToEveryone.bind(this));

		if (!this._hooksRegistered) {
			this._registerHoverListener();
			this._registerActorUpdateListener();
			this._registerCombatListeners();
			this._hooksRegistered = true;
		}
	}

	/** @override */
	async close(options?: Application.CloseOptions) {
		if (this._pendingHoverFrame !== null) {
			cancelAnimationFrame(this._pendingHoverFrame);
			this._pendingHoverFrame = null;
		}

		if (this._requirementDebounceTimer) {
			clearTimeout(this._requirementDebounceTimer);
			this._requirementDebounceTimer = null;
		}

		if (this._combatRenderTimer) {
			clearTimeout(this._combatRenderTimer);
			this._combatRenderTimer = null;
		}

		if (this._hooks) {
			this._hooks.unregisterAll();
			this._hooks = null;
		}

		this._hooksRegistered = false;

		return super.close(options);
	}

	_registerHoverListener() {
		if (!this._hooks) {
			this._hooks = new HookRegistry();
		}

		this._hooks.on("dispatchCallHoverActor", (actorId: unknown) => {
			this._onHoverActor(actorId as string | null);
		});
	}

	_onHoverActor(actorId: string | null) {
		if (this._hoveredActorId === actorId) return;
		this._hoveredActorId = actorId;

		if (!this._updateGraphInPlace('hero')) {
			this.render(false);
		}
	}

	_registerActorUpdateListener() {
		if (!this._hooks) {
			this._hooks = new HookRegistry();
		}

		this._hooks.on("updateActor", (actor: unknown, changes: unknown, _options: unknown, _userId: unknown) => {
			const a = actor as Actor;
			const c = changes as object;

			const assignedActorIds: string[] = this.actor.getFlag(NS, "assignedActorIds") ?? [];
			if (!assignedActorIds.includes(a.id ?? "")) return;

			const dispatchStatus: DispatchStatus = this.actor.getFlag(NS, "dispatchStatus") ?? "idle";
			if (dispatchStatus === "assessing") return;

			if (foundry.utils.hasProperty(c, "system.stats") ||
				foundry.utils.hasProperty(c, "system.resources") ||
				foundry.utils.hasProperty(c, "system.attributes.conditions") ||
				foundry.utils.hasProperty(c, "flags")) {
				if (!this._updateGraphInPlace('hero')) {
					this.render(false);
				}
			}
		});
	}

	_registerCombatListeners() {
		if (!this._hooks) {
			this._hooks = new HookRegistry();
		}

		const queueCombatRender = () => {
			if (this._combatRenderTimer) return;
			this._combatRenderTimer = setTimeout(() => {
				this._combatRenderTimer = null;
				this.render(false);
			}, 50);
		};

		this._hooks.on("updateCombat", queueCombatRender);
		this._hooks.on("updateCombatant", queueCombatRender);
		this._hooks.on("createCombat", queueCombatRender);
		this._hooks.on("deleteCombat", queueCombatRender);
		this._hooks.on("createCombatant", queueCombatRender);
		this._hooks.on("deleteCombatant", queueCombatRender);
	}

	async _onChangeCallType(event: JQuery.ChangeEvent) {
		const select = event.currentTarget as HTMLSelectElement;
		await this.actor.setFlag(NS, "callType", select.value);
	}

	async _onChangeCallerName(event: JQuery.ChangeEvent) {
		const input = event.currentTarget as HTMLInputElement;
		await this.actor.setFlag(NS, "callerName", input.value);
	}

	async _onChangeCallerQuote(event: JQuery.ChangeEvent) {
		const input = event.currentTarget as HTMLTextAreaElement;
		await this.actor.setFlag(NS, "callerQuote", input.value);
	}

	async _onChangeRequirementsText(event: JQuery.ChangeEvent) {
		const input = event.currentTarget as HTMLTextAreaElement;
		await this.actor.setFlag(NS, "requirementsText", input.value);
	}

	async _onChangeRequirement(event: JQuery.ChangeEvent) {
		const input = event.currentTarget as HTMLInputElement;
		const labelKey = input.dataset.label;
		if (!labelKey) return;

		const value = input.value.trim();
		const parsed = parseInt(value, 10);
		const numValue = (value === "" || isNaN(parsed)) ? null : Math.max(-3, Math.min(4, parsed));

		await this._updateRequirementsDebounced(labelKey, numValue);
	}

	async _onSelectHero(event: JQuery.ClickEvent) {
		event.preventDefault();
		const button = event.currentTarget as HTMLButtonElement;
		const actorId = button.dataset.actorId;
		if (!actorId) return;

		const currentIds: string[] = this.actor.getFlag(NS, "assignedActorIds") ?? [];
		const isCurrentlySelected = currentIds.includes(actorId);
		const newAssignedActorIds = isCurrentlySelected ? [] : [actorId];

		if (this.actor.isOwner) {
			await this.actor.setFlag(NS, "assignedActorIds", newAssignedActorIds);
			return;
		}

		await queryGM("assignHero", { callActorId: this.actor.id, assignedActorIds: newAssignedActorIds });
	}

	_onHeroButtonEnter(event: JQuery.MouseEnterEvent) {
		const button = event.currentTarget as HTMLButtonElement;
		const actorId = button.dataset.actorId;
		if (!actorId) return;

		if (this._hoveredActorId === actorId) return;
		this._hoveredActorId = actorId;
		this._scheduleGraphUpdate();
	}

	_onHeroGroupLeave(_event: JQuery.MouseLeaveEvent) {
		if (this._hoveredActorId === null) return;
		this._hoveredActorId = null;
		this._scheduleGraphUpdate();
	}

	_scheduleGraphUpdate() {
		if (this._pendingHoverFrame !== null) {
			cancelAnimationFrame(this._pendingHoverFrame);
			this._pendingHoverFrame = null;
		}

		this._pendingHoverFrame = requestAnimationFrame(() => {
			this._pendingHoverFrame = null;

			if (!this._updateGraphInPlace('hero')) {
				this.render(false);
			}
		});
	}

	async _onDispatch(event: JQuery.ClickEvent) {
		event.preventDefault();

		const assignedActorIds: string[] = this.actor.getFlag(NS, "assignedActorIds") ?? [];
		if (assignedActorIds.length === 0) {
			ui.notifications?.warn?.("Assign a hero first.");
			return;
		}

		const assignedActor = game.actors?.get(assignedActorIds[0]);
		if (!assignedActor) {
			ui.notifications?.warn?.("Assigned hero not found.");
			return;
		}

		if (this.actor.isOwner) {
			await executeDispatch(this.actor, assignedActor);
			return;
		}

		await queryGM("dispatch", { callActorId: this.actor.id });
	}

	async _onResetCall(event: JQuery.ClickEvent) {
		event.preventDefault();

		if (!game.user?.isGM) {
			ui.notifications?.warn?.("Only GM can reset calls.");
			return;
		}

		this._previousGraphState = null;

		await this.actor.update({
			[`flags.${NS}.dispatchStatus`]: "idle",
			[`flags.${NS}.fitResult`]: null,
			[`flags.${NS}.forwardChange`]: null,
			[`flags.${NS}.assignedActorIds`]: [],
			[`flags.${NS}.snapshotHeroLabels`]: null,
		});
	}

	async _onRevealFit(event: JQuery.ClickEvent) {
		event.preventDefault();
		this.render(false);
	}

	async _onShowToEveryone(event: JQuery.ClickEvent) {
		event.preventDefault();

		game.socket?.emit(SOCKET_NS, {
			action: "showCallToEveryone",
			callActorId: this.actor.id,
			callActorUuid: this.actor.uuid,
			fromUserId: game.user?.id,
		});

		handleShowCallToEveryone(this.actor.id!, game.user?.id ?? "");
	}

	/** @override */
	async _render(force?: boolean, options?: RenderOptions) {
		const oldHeroPath = this.element?.[0]?.querySelector(".labels-graph-overlay-hero")?.getAttribute("d") ?? null;
		const oldReqPath = this.element?.[0]?.querySelector(".labels-graph-overlay-requirements")?.getAttribute("d") ?? null;

		if (oldHeroPath || oldReqPath) {
			this._previousGraphState = {
				heroPath: oldHeroPath ?? "",
				reqPath: oldReqPath ?? "",
			};
		}

		await super._render(force, options);
		this._animateGraphTransition();
	}

	_animateGraphTransition() {
		const prev = this._previousGraphState;
		if (!prev) return;

		const heroPath = this.element?.[0]?.querySelector(".labels-graph-overlay-hero") as SVGPathElement | null;
		const reqPath = this.element?.[0]?.querySelector(".labels-graph-overlay-requirements") as SVGPathElement | null;

		if (heroPath && prev.heroPath) {
			const newPath = heroPath.getAttribute("d");
			if (newPath && prev.heroPath !== newPath) {
				heroPath.style.transition = "none";
				heroPath.setAttribute("d", prev.heroPath);
				void heroPath.getBoundingClientRect();
				heroPath.style.transition = "d 0.4s cubic-bezier(0.4, 0, 0.2, 1), fill 0.3s ease, stroke 0.3s ease";
				heroPath.setAttribute("d", newPath);
			}
		}

		if (reqPath && prev.reqPath) {
			const newPath = reqPath.getAttribute("d");
			if (newPath && prev.reqPath !== newPath) {
				reqPath.style.transition = "none";
				reqPath.setAttribute("d", prev.reqPath);
				void reqPath.getBoundingClientRect();
				reqPath.style.transition = "d 0.4s cubic-bezier(0.4, 0, 0.2, 1), fill 0.3s ease, stroke 0.3s ease";
				reqPath.setAttribute("d", newPath);
			}
		}

		this._previousGraphState = null;
	}

	_updateGraphInPlace(changes: 'hero' | 'requirements' | 'all'): boolean {
		const container = this.element?.[0]?.querySelector('.call-sheet__graph') as HTMLElement | null;
		if (!container) return false;

		const dispatchStatus: DispatchStatus = this.actor.getFlag(NS, "dispatchStatus") ?? "idle";
		const isGM = game.user?.isGM ?? false;
		const isAssessed = dispatchStatus === "qualified";
		const showRequirementsOverlay = isGM || isAssessed;

		const requirements: CallRequirements = this._cachedRequirements ?? this.actor.getFlag(NS, "requirements") ?? {};

		let heroLabels: Record<string, number> | null = null;
		if (changes === 'hero' || changes === 'all') {
			const snapshotLabels: Record<string, number> | null = this.actor.getFlag(NS, "snapshotHeroLabels") ?? null;

			if (snapshotLabels) {
				heroLabels = snapshotLabels;
			} else {
				const assignedActorIds: string[] = this.actor.getFlag(NS, "assignedActorIds") ?? [];
				const assignedActor = assignedActorIds.length > 0 ? game.actors?.get(assignedActorIds[0]) : null;
				const hoveredActor = this._hoveredActorId ? game.actors?.get(this._hoveredActorId) : null;
				const graphActor = hoveredActor ?? assignedActor;

				if (graphActor) {
					const data = extractLabelsData(graphActor);
					heroLabels = data?.labels ?? null;
				}
			}

			this._cachedHeroLabels = heroLabels;
		} else {
			heroLabels = this._cachedHeroLabels;
		}

		const success = updateOverlayGraphAnimated(
			container,
			heroLabels,
			showRequirementsOverlay ? requirements : {},
			{
				size: GRAPH_PRESETS.callSheet.size,
				showIcons: GRAPH_PRESETS.callSheet.showIcons,
				isAssessed,
			}
		);

		if (success && heroLabels) {
			const tooltipParts: string[] = [];
			for (const key of LABEL_ORDER) {
				const hero = heroLabels[key] ?? 0;
				tooltipParts.push(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${hero}`);
			}
			container.setAttribute('data-tooltip', tooltipParts.join(' | '));
		}

		return success;
	}

	async _updateRequirementsDebounced(labelKey: string, value: number | null) {
		if (this._requirementDebounceTimer) {
			clearTimeout(this._requirementDebounceTimer);
		}

		if (!this._cachedRequirements) {
			this._cachedRequirements = { ...this.actor.getFlag(NS, "requirements") ?? {} };
		}

		if (value !== null) {
			this._cachedRequirements[labelKey as keyof CallRequirements] = value;
		} else {
			delete this._cachedRequirements[labelKey as keyof CallRequirements];
		}

		this._updateGraphInPlace('requirements');

		this._requirementDebounceTimer = setTimeout(async () => {
			const newRequirements: Record<string, number> = {};
			for (const key of LABEL_ORDER) {
				const val = this._cachedRequirements?.[key as keyof CallRequirements];
				if (val != null) {
					newRequirements[key] = val;
				}
			}

			await this.actor.unsetFlag(NS, "requirements");
			if (Object.keys(newRequirements).length > 0) {
				await this.actor.setFlag(NS, "requirements", newRequirements);
			}
		}, 150);
	}
}

/**
 * Set hovered actor from turn cards (for all open call sheets)
 */
export function setCallSheetHoveredActor(actorId: string | null) {
	Hooks.callAll("dispatchCallHoverActor", actorId);
}

// ────────────────────────────────────────────────────────────────────────────
// GM Query Handlers
// ────────────────────────────────────────────────────────────────────────────

async function executeDispatch(callActor: Actor, assignedActor: Actor): Promise<{ success: boolean }> {
	await callActor.setFlag(NS, "dispatchStatus", "assessing");
	await new Promise((r) => setTimeout(r, 800));

	const heroData = extractLabelsData(assignedActor);
	if (!heroData) {
		await callActor.setFlag(NS, "dispatchStatus", "idle");
		return { success: false };
	}

	const requirements: CallRequirements = callActor.getFlag(NS, "requirements") ?? {};
	const fitResult = checkFitResult(heroData.labels, requirements);
	const snapshotHeroLabels = { ...heroData.labels };
	const forwardChange: number | null = fitResult === "great" ? 1 : fitResult === "poor" ? -1 : null;

	if (forwardChange !== null) {
		const cur = Number(foundry.utils.getProperty(assignedActor, "system.resources.forward.value")) || 0;
		const next = Math.max(FORWARD_MIN, Math.min(FORWARD_MAX, cur + forwardChange));
		if (next !== cur) await assignedActor.update({ "system.resources.forward.value": next });
	}

	const combat = getActiveCombat();
	if (combat && game.user?.isGM) {
		const teamCombatants = getTeamCombatants(combat);
		const heroCombatant = teamCombatants.find((c) => c.actorId === assignedActor.id);
		if (heroCombatant) {
			await CooldownSystem.gmApplyTurn(combat, heroCombatant.id);
		}
	}

	const fitName = fitResult === "great" ? "great fit" : fitResult === "good" ? "decent fit" : "poor fit";
	const fitCss = fitResult === "good" ? "decent" : fitResult;
	const fwdTxt = forwardChange
		? ` <span class="forward-change forward-change--${forwardChange > 0 ? "positive" : "negative"}">${forwardChange > 0 ? "+" : ""}${forwardChange} Forward</span>`
		: "";

	await ChatMessage.create({
		content: `<div class="call-dispatch-result call-dispatch-result--${fitCss}"><h2 class="dispatch-header">@UUID[Actor.${callActor.id}]{${callActor.name}}</h2><div class="dispatch-content"><b>${assignedActor.name}</b> is a <b>${fitName}.</b>${fwdTxt}</div></div>`,
		type: CONST.CHAT_MESSAGE_TYPES.OTHER,
	});

	await callActor.update({
		[`flags.${NS}.dispatchStatus`]: "qualified",
		[`flags.${NS}.fitResult`]: fitResult,
		[`flags.${NS}.forwardChange`]: forwardChange,
		[`flags.${NS}.snapshotHeroLabels`]: snapshotHeroLabels,
	});
	return { success: true };
}

export function registerCallSheetQueries(): void {
	CONFIG.queries[`${DISPATCH_NS}.assignHero`] = async ({ callActorId, assignedActorIds }) => {
		const actor = game.actors?.get(callActorId);
		if (!actor) return { success: false };
		await actor.setFlag(NS, "assignedActorIds", assignedActorIds);
		return { success: true };
	};

	CONFIG.queries[`${DISPATCH_NS}.dispatch`] = async ({ callActorId }) => {
		const callActor = game.actors?.get(callActorId);
		if (!callActor) return { success: false };
		const ids: string[] = callActor.getFlag(NS, "assignedActorIds") ?? [];
		const hero = ids[0] ? game.actors?.get(ids[0]) : null;
		if (!hero) return { success: false };
		return executeDispatch(callActor, hero);
	};
}

async function queryGM<T>(queryName: string, data: object): Promise<T | null> {
	const gm = game.users?.activeGM;
	if (!gm) {
		ui.notifications?.warn?.("A GM must be online.");
		return null;
	}
	try {
		return await gm.query(`${DISPATCH_NS}.${queryName}`, data, { timeout: 10000 }) as T;
	} catch (e) {
		console.error(`[${DISPATCH_NS}] Query failed:`, e);
		return null;
	}
}

// ────────────────────────────────────────────────────────────────────────────
// Socket Handler
// ────────────────────────────────────────────────────────────────────────────

let _callSheetSocketHandler: ((data: unknown) => void) | null = null;

function handleShowCallToEveryone(callActorId: string, _fromUserId: string): void {
	const currentUser = game.user;
	if (!currentUser) return;

	const isGM = currentUser.isGM ?? false;
	const callActor = game.actors?.get(callActorId);
	if (!callActor) {
		console.warn(`[${DISPATCH_NS}] Call actor not found: ${callActorId}`);
		return;
	}

	if (!callActor.testUserPermission(currentUser, "LIMITED")) {
		console.log(`[${DISPATCH_NS}] User lacks permission to view call: ${callActorId}`);
		return;
	}

	if (!isGM) {
		const openWindows = Object.values(ui.windows) as Application[];
		for (const app of openWindows) {
			if (app instanceof CallSheet && app.actor?.id !== callActorId) {
				app.close();
			}
		}
	}

	callActor.sheet?.render(true);
}

export function registerCallSheetSocketHandler(): void {
	if (!game.socket) {
		console.warn(`[${DISPATCH_NS}] Socket not available for call sheet handler`);
		return;
	}

	if (_callSheetSocketHandler) {
		game.socket.off(SOCKET_NS, _callSheetSocketHandler);
		_callSheetSocketHandler = null;
	}

	_callSheetSocketHandler = (data: unknown) => {
		const payload = data as {
			action?: string;
			callActorId?: string;
			callActorUuid?: string;
			fromUserId?: string;
		} | null;

		if (!payload?.action) return;

		if (payload.action === "showCallToEveryone") {
			const callActorId = payload.callActorId;
			const fromUserId = payload.fromUserId ?? "";

			if (!callActorId) {
				console.warn(`[${DISPATCH_NS}] showCallToEveryone: missing callActorId`);
				return;
			}

			handleShowCallToEveryone(callActorId, fromUserId);
		}
	};

	game.socket.on(SOCKET_NS, _callSheetSocketHandler);
	console.log(`[${DISPATCH_NS}] Call sheet socket handler registered`);
}

/**
 * Register the CallSheet class
 */
export function registerCallSheet(): void {
	Actors.registerSheet(DISPATCH_NS, CallSheet, {
		types: ["call"],
		makeDefault: true,
		label: "DISPATCH.Call.Sheet",
	});

	registerCallSheetQueries();

	Hooks.once("ready", () => {
		registerCallSheetSocketHandler();
	});
}
