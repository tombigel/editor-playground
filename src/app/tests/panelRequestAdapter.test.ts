import { describe, expect, it, vi } from "vitest";
import { createDefaultEditorPanelState } from "@/api/editorNavigationApi";
import {
	applyPanelRequestWithCallbacks,
	type PanelRequestCallbacks,
} from "../panelRequestAdapter";

function createCallbacks(): PanelRequestCallbacks {
	return {
		onSettingsOpenChange: vi.fn(),
		onManageFontsOpenChange: vi.fn(),
		onHelpOpenChange: vi.fn(),
		onShortcutsOpenChange: vi.fn(),
		onAboutOpenChange: vi.fn(),
		onComponentsOpenChange: vi.fn(),
		onComponentsPositionChange: vi.fn(),
		onPagesOpenChange: vi.fn(),
		onPagesPositionChange: vi.fn(),
		onSectionTemplatesOpenChange: vi.fn(),
		onTextTypesOpenChange: vi.fn(),
		onAiOpenChange: vi.fn(),
		onSettingsSectionTargetChange: vi.fn(),
		onHelpEntryTargetChange: vi.fn(),
		onPagesPanelTabTargetChange: vi.fn(),
		onRequestedPageSettingsIdChange: vi.fn(),
	};
}

describe("applyPanelRequestWithCallbacks", () => {
	it("forwards open requests only to the targeted panel callback", () => {
		const callbacks = createCallbacks();
		applyPanelRequestWithCallbacks(
			createDefaultEditorPanelState(),
			{ type: "open", panel: "settings" },
			callbacks,
		);

		expect(callbacks.onSettingsOpenChange).toHaveBeenCalledWith(true);
		expect(callbacks.onHelpOpenChange).not.toHaveBeenCalled();
		expect(callbacks.onAiOpenChange).not.toHaveBeenCalled();
	});

	it("does not fire a callback when the request is a no-op", () => {
		const callbacks = createCallbacks();
		const state = {
			...createDefaultEditorPanelState(),
			settingsOpen: true,
		};
		applyPanelRequestWithCallbacks(
			state,
			{ type: "open", panel: "settings" },
			callbacks,
		);

		expect(callbacks.onSettingsOpenChange).not.toHaveBeenCalled();
	});

	it("toggles the AI panel without touching manage fonts", () => {
		const callbacks = createCallbacks();
		applyPanelRequestWithCallbacks(
			createDefaultEditorPanelState(),
			{ type: "toggle", panel: "ai" },
			callbacks,
		);

		expect(callbacks.onAiOpenChange).toHaveBeenCalledWith(true);
		expect(callbacks.onManageFontsOpenChange).not.toHaveBeenCalled();
	});

	it("closes every open panel on closeAll, including the AI panel", () => {
		const callbacks = createCallbacks();
		const state = {
			...createDefaultEditorPanelState(),
			settingsOpen: true,
			pagesOpen: true,
			aiOpen: true,
		};
		applyPanelRequestWithCallbacks(state, { type: "closeAll" }, callbacks);

		expect(callbacks.onSettingsOpenChange).toHaveBeenCalledWith(false);
		expect(callbacks.onPagesOpenChange).toHaveBeenCalledWith(false);
		expect(callbacks.onAiOpenChange).toHaveBeenCalledWith(false);
		expect(callbacks.onHelpOpenChange).not.toHaveBeenCalled();
	});

	it("opens settings with a section target for openSettingsSection", () => {
		const callbacks = createCallbacks();
		applyPanelRequestWithCallbacks(
			createDefaultEditorPanelState(),
			{ type: "openSettingsSection", section: "transfer" },
			callbacks,
		);

		expect(callbacks.onSettingsOpenChange).toHaveBeenCalledWith(true);
		expect(callbacks.onSettingsSectionTargetChange).toHaveBeenCalledWith(
			"transfer",
		);
	});

	it("opens the pages panel with page target, tab, and position for openPages", () => {
		const callbacks = createCallbacks();
		applyPanelRequestWithCallbacks(
			createDefaultEditorPanelState(),
			{
				type: "openPages",
				pageId: "page-2",
				tab: "settings",
				position: { top: 100, left: 200 },
			},
			callbacks,
		);

		expect(callbacks.onPagesOpenChange).toHaveBeenCalledWith(true);
		expect(callbacks.onRequestedPageSettingsIdChange).toHaveBeenCalledWith(
			"page-2",
		);
		expect(callbacks.onPagesPanelTabTargetChange).toHaveBeenCalledWith(
			"settings",
		);
		expect(callbacks.onPagesPositionChange).toHaveBeenCalledWith({
			top: 100,
			left: 200,
		});
	});

	it("clears a stale page settings target when openPages has no pageId", () => {
		const callbacks = createCallbacks();
		const state = {
			...createDefaultEditorPanelState(),
			requestedPageSettingsId: "page-9",
		};
		applyPanelRequestWithCallbacks(state, { type: "openPages" }, callbacks);

		expect(callbacks.onRequestedPageSettingsIdChange).toHaveBeenCalledWith(
			null,
		);
	});

	it("opens help with an entry target for openHelpEntry", () => {
		const callbacks = createCallbacks();
		applyPanelRequestWithCallbacks(
			createDefaultEditorPanelState(),
			{ type: "openHelpEntry", entryId: "doc:docs/GETTING_STARTED.md" },
			callbacks,
		);

		expect(callbacks.onHelpOpenChange).toHaveBeenCalledWith(true);
		expect(callbacks.onHelpEntryTargetChange).toHaveBeenCalledWith(
			"doc:docs/GETTING_STARTED.md",
		);
	});
});
