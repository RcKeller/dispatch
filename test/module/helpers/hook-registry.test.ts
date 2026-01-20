/**
 * Tests for helpers/hook-registry.ts
 * Hook lifecycle management utility
 */

import { hooks } from "../../setup";

describe("hook-registry", () => {
	let HookRegistry: new () => {
		on: (event: string, fn: (...args: unknown[]) => void) => number;
		once: (event: string, fn: (...args: unknown[]) => void) => number;
		off: (event: string, id: number) => void;
		onSocket: (namespace: string, handler: (data: unknown) => void) => void;
		offSocket: (namespace: string) => void;
		unregisterAll: () => void;
		readonly isEmpty: boolean;
		readonly hookCount: number;
		readonly socketHandlerCount: number;
	};

	beforeAll(async () => {
		const module = await import("../../../src/module/helpers/hook-registry");
		HookRegistry = module.HookRegistry;
	});

	beforeEach(() => {
		hooks.clearAll();
		hooks.clearInvocations();
		jest.clearAllMocks();
	});

	// ========================================================================
	// Hook Registration
	// ========================================================================

	describe("on", () => {
		it("should register a hook successfully", () => {
			const registry = new HookRegistry();
			const handler = jest.fn();

			const id = registry.on("updateActor", handler);

			expect(id).toBeDefined();
			expect(typeof id).toBe("number");
			expect(hooks.wasCalled("on")).toBe(true);
			expect(hooks.hasCallbacks("updateActor")).toBe(true);
		});

		it("should track the registered hook", () => {
			const registry = new HookRegistry();
			const handler = jest.fn();

			registry.on("updateActor", handler);

			expect(registry.hookCount).toBe(1);
			expect(registry.isEmpty).toBe(false);
		});

		it("should allow multiple hooks on same event", () => {
			const registry = new HookRegistry();
			const handler1 = jest.fn();
			const handler2 = jest.fn();

			const id1 = registry.on("updateActor", handler1);
			const id2 = registry.on("updateActor", handler2);

			expect(id1).not.toBe(id2);
			expect(registry.hookCount).toBe(2);
			expect(hooks.callCount("on")).toBe(2);
		});

		it("should allow hooks on different events", () => {
			const registry = new HookRegistry();
			const handler1 = jest.fn();
			const handler2 = jest.fn();

			registry.on("updateActor", handler1);
			registry.on("createCombat", handler2);

			expect(registry.hookCount).toBe(2);
		});
	});

	describe("once", () => {
		it("should register a one-time hook", () => {
			const registry = new HookRegistry();
			const handler = jest.fn();

			const id = registry.once("ready", handler);

			expect(id).toBeDefined();
			expect(hooks.wasCalled("once")).toBe(true);
			expect(hooks.hasCallbacks("ready")).toBe(true);
		});

		it("should track the once hook", () => {
			const registry = new HookRegistry();
			const handler = jest.fn();

			registry.once("ready", handler);

			expect(registry.hookCount).toBe(1);
		});
	});

	describe("off", () => {
		it("should unregister a specific hook by ID", () => {
			const registry = new HookRegistry();
			const handler = jest.fn();

			const id = registry.on("updateActor", handler);
			registry.off("updateActor", id);

			expect(hooks.wasCalled("off")).toBe(true);
			expect(registry.hookCount).toBe(0);
		});

		it("should no-op for invalid/unknown ID", () => {
			const registry = new HookRegistry();

			// Should not throw
			registry.off("updateActor", 999999);

			expect(hooks.wasCalled("off")).toBe(false);
		});

		it("should only remove the specified hook", () => {
			const registry = new HookRegistry();
			const handler1 = jest.fn();
			const handler2 = jest.fn();

			const id1 = registry.on("updateActor", handler1);
			const id2 = registry.on("updateActor", handler2);
			registry.off("updateActor", id1);

			expect(registry.hookCount).toBe(1);
		});
	});

	// ========================================================================
	// Socket Handlers
	// ========================================================================

	describe("onSocket", () => {
		beforeEach(() => {
			(globalThis as any).game = {
				socket: {
					on: jest.fn(),
					off: jest.fn(),
				},
			};
		});

		it("should register a socket handler", () => {
			const registry = new HookRegistry();
			const handler = jest.fn();

			registry.onSocket("module.test", handler);

			expect((globalThis as any).game.socket.on).toHaveBeenCalledWith("module.test", handler);
			expect(registry.socketHandlerCount).toBe(1);
		});

		it("should replace existing handler for same namespace", () => {
			const registry = new HookRegistry();
			const handler1 = jest.fn();
			const handler2 = jest.fn();

			registry.onSocket("module.test", handler1);
			registry.onSocket("module.test", handler2);

			expect((globalThis as any).game.socket.off).toHaveBeenCalledWith("module.test", handler1);
			expect((globalThis as any).game.socket.on).toHaveBeenCalledWith("module.test", handler2);
			expect(registry.socketHandlerCount).toBe(1);
		});

		it("should allow multiple handlers for different namespaces", () => {
			const registry = new HookRegistry();
			const handler1 = jest.fn();
			const handler2 = jest.fn();

			registry.onSocket("module.test1", handler1);
			registry.onSocket("module.test2", handler2);

			expect(registry.socketHandlerCount).toBe(2);
		});

		it("should handle missing socket gracefully", () => {
			(globalThis as any).game = { socket: null };
			const registry = new HookRegistry();
			const handler = jest.fn();

			// Should not throw
			registry.onSocket("module.test", handler);

			expect(registry.socketHandlerCount).toBe(0);
		});
	});

	describe("offSocket", () => {
		beforeEach(() => {
			(globalThis as any).game = {
				socket: {
					on: jest.fn(),
					off: jest.fn(),
				},
			};
		});

		it("should unregister a socket handler", () => {
			const registry = new HookRegistry();
			const handler = jest.fn();

			registry.onSocket("module.test", handler);
			registry.offSocket("module.test");

			expect((globalThis as any).game.socket.off).toHaveBeenCalledWith("module.test", handler);
			expect(registry.socketHandlerCount).toBe(0);
		});

		it("should no-op for unknown namespace", () => {
			const registry = new HookRegistry();

			// Should not throw
			registry.offSocket("module.unknown");

			expect((globalThis as any).game.socket.off).not.toHaveBeenCalled();
		});
	});

	// ========================================================================
	// Lifecycle Management
	// ========================================================================

	describe("unregisterAll", () => {
		beforeEach(() => {
			(globalThis as any).game = {
				socket: {
					on: jest.fn(),
					off: jest.fn(),
				},
			};
		});

		it("should unregister all hooks", () => {
			const registry = new HookRegistry();

			registry.on("updateActor", jest.fn());
			registry.on("createCombat", jest.fn());
			registry.once("ready", jest.fn());

			hooks.clearInvocations(); // Clear the "on"/"once" calls
			registry.unregisterAll();

			expect(hooks.callCount("off")).toBe(3);
			expect(registry.hookCount).toBe(0);
			expect(registry.isEmpty).toBe(true);
		});

		it("should unregister all socket handlers", () => {
			const registry = new HookRegistry();
			const handler1 = jest.fn();
			const handler2 = jest.fn();

			registry.onSocket("module.test1", handler1);
			registry.onSocket("module.test2", handler2);

			registry.unregisterAll();

			expect((globalThis as any).game.socket.off).toHaveBeenCalledTimes(2);
			expect(registry.socketHandlerCount).toBe(0);
		});

		it("should be safe to call when empty", () => {
			const registry = new HookRegistry();

			// Should not throw
			registry.unregisterAll();

			expect(registry.isEmpty).toBe(true);
		});

		it("should reset internal state", () => {
			const registry = new HookRegistry();

			registry.on("updateActor", jest.fn());
			registry.unregisterAll();

			// Should be able to re-register after clearing
			registry.on("updateActor", jest.fn());
			expect(registry.hookCount).toBe(1);
		});

		it("should clear both hooks and sockets together", () => {
			const registry = new HookRegistry();

			registry.on("updateActor", jest.fn());
			registry.on("createCombat", jest.fn());
			registry.onSocket("module.test", jest.fn());

			expect(registry.hookCount).toBe(2);
			expect(registry.socketHandlerCount).toBe(1);
			expect(registry.isEmpty).toBe(false);

			registry.unregisterAll();

			expect(registry.hookCount).toBe(0);
			expect(registry.socketHandlerCount).toBe(0);
			expect(registry.isEmpty).toBe(true);
		});
	});

	// ========================================================================
	// Properties
	// ========================================================================

	describe("isEmpty", () => {
		it("should return true for new registry", () => {
			const registry = new HookRegistry();
			expect(registry.isEmpty).toBe(true);
		});

		it("should return false after adding hook", () => {
			const registry = new HookRegistry();
			registry.on("test", jest.fn());
			expect(registry.isEmpty).toBe(false);
		});

		it("should return false after adding socket handler", () => {
			(globalThis as any).game = { socket: { on: jest.fn(), off: jest.fn() } };
			const registry = new HookRegistry();
			registry.onSocket("module.test", jest.fn());
			expect(registry.isEmpty).toBe(false);
		});

		it("should return true after unregisterAll", () => {
			const registry = new HookRegistry();
			registry.on("test", jest.fn());
			registry.unregisterAll();
			expect(registry.isEmpty).toBe(true);
		});
	});

	describe("hookCount", () => {
		it("should return 0 for new registry", () => {
			const registry = new HookRegistry();
			expect(registry.hookCount).toBe(0);
		});

		it("should increment with each hook added", () => {
			const registry = new HookRegistry();

			registry.on("event1", jest.fn());
			expect(registry.hookCount).toBe(1);

			registry.on("event2", jest.fn());
			expect(registry.hookCount).toBe(2);

			registry.once("event3", jest.fn());
			expect(registry.hookCount).toBe(3);
		});

		it("should decrement when hook removed", () => {
			const registry = new HookRegistry();

			const id = registry.on("test", jest.fn());
			expect(registry.hookCount).toBe(1);

			registry.off("test", id);
			expect(registry.hookCount).toBe(0);
		});

		it("should not count socket handlers", () => {
			(globalThis as any).game = { socket: { on: jest.fn(), off: jest.fn() } };
			const registry = new HookRegistry();

			registry.on("test", jest.fn());
			registry.onSocket("module.test", jest.fn());

			expect(registry.hookCount).toBe(1);
			expect(registry.socketHandlerCount).toBe(1);
		});
	});

	describe("socketHandlerCount", () => {
		beforeEach(() => {
			(globalThis as any).game = { socket: { on: jest.fn(), off: jest.fn() } };
		});

		it("should return 0 for new registry", () => {
			const registry = new HookRegistry();
			expect(registry.socketHandlerCount).toBe(0);
		});

		it("should increment with each socket handler added", () => {
			const registry = new HookRegistry();

			registry.onSocket("module.test1", jest.fn());
			expect(registry.socketHandlerCount).toBe(1);

			registry.onSocket("module.test2", jest.fn());
			expect(registry.socketHandlerCount).toBe(2);
		});

		it("should not increment when replacing handler", () => {
			const registry = new HookRegistry();

			registry.onSocket("module.test", jest.fn());
			registry.onSocket("module.test", jest.fn()); // Replace

			expect(registry.socketHandlerCount).toBe(1);
		});
	});

	// ========================================================================
	// Multiple Registry Instances
	// ========================================================================

	describe("Multiple registry instances", () => {
		it("should maintain independent state", () => {
			const registry1 = new HookRegistry();
			const registry2 = new HookRegistry();

			registry1.on("event1", jest.fn());
			registry2.on("event2", jest.fn());
			registry2.on("event3", jest.fn());

			expect(registry1.hookCount).toBe(1);
			expect(registry2.hookCount).toBe(2);
		});

		it("should unregister independently", () => {
			const registry1 = new HookRegistry();
			const registry2 = new HookRegistry();

			registry1.on("event1", jest.fn());
			registry2.on("event2", jest.fn());

			registry1.unregisterAll();

			expect(registry1.hookCount).toBe(0);
			expect(registry2.hookCount).toBe(1);
		});
	});
});
