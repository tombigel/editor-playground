import { describe, expect, it } from "vitest";
import {
	applyEditorNavigationState,
	applyEditorPanelRequest,
	applyEditorViewFlags,
	buildEditorNavigationSearch,
	createDefaultEditorPanelState,
	createInitialState,
	parseEditorNavigationSearch,
	resolveEditorNodeTarget,
} from "../editorApi";

describe("api/editorNavigationApi", () => {
	it("round-trips editor navigation URL state while preserving unrelated params", () => {
		const search = buildEditorNavigationSearch(
			{
				activePageId: "page-home",
				selectedNodeId: "text_4",
				focusedMode: "design",
				panel: "settings",
				settingsSection: "transfer",
				helpEntryId: "doc:docs/API.md",
				pageTargetId: "page-home",
				pagesTab: "page",
				tourTopic: "api",
				tourStep: "model-transfer",
				showHidden: false,
				previewSticky: true,
				animationPreviewEnabled: true,
				spacerVisibility: "all",
				showGridLanes: true,
				showDebugInfo: true,
			},
			"?keep=1",
		);

		expect(search).toContain("keep=1");
		expect(parseEditorNavigationSearch(search)).toEqual({
			activePageId: "page-home",
			selectedNodeId: "text_4",
			focusedMode: "design",
			panel: "settings",
			settingsSection: "transfer",
			helpEntryId: "doc:docs/API.md",
			pageTargetId: "page-home",
			pagesTab: "page",
			tourTopic: "api",
			tourStep: "model-transfer",
			showHidden: false,
			previewSticky: true,
			animationPreviewEnabled: true,
			spacerVisibility: "all",
			showGridLanes: true,
			showDebugInfo: true,
		});
	});

	it("normalizes invalid URL values out of navigation state", () => {
		expect(
			parseEditorNavigationSearch(
				"?focus-mode=banana&panel=ghost&settings=nope&pages-tab=other&debug=maybe",
			),
		).toEqual({});
		expect(parseEditorNavigationSearch("?focus-mode=none")).toEqual({
			focusedMode: null,
		});
	});

	it("resolves stable node targets without generated ids", () => {
		const state = createInitialState();
		const titleId = resolveEditorNodeTarget(state.document, {
			name: "Post Title",
			contentType: "text",
		});
		const firstStickyId = resolveEditorNodeTarget(state.document, {
			sticky: true,
		});

		expect(titleId).toBeTruthy();
		expect(state.document.nodes[titleId ?? ""]?.name).toBe("Post Title");
		expect(firstStickyId).toBeNull();
	});

	it("applies editor navigation state through public editor state helpers", () => {
		const state = createInitialState();
		const titleId = resolveEditorNodeTarget(state.document, {
			name: "Post Title",
		});
		if (!titleId) {
			throw new Error("Expected initial Post Title node");
		}

		const next = applyEditorNavigationState(state, {
			selectedNodeId: titleId,
			focusedMode: "design",
			showDebugInfo: true,
			spacerVisibility: "all",
		});

		expect(next.selectedId).toBe(titleId);
		expect(next.ui.focusedMode).toBe("design");
		expect(next.ui.inspectorCollapsed).toBe(true);
		expect(next.ui.temporaryInspectorOpen).toBe(false);
		expect(next.ui.showDebugInfo).toBe(true);
		expect(next.ui.spacerVisibility).toBe("all");
	});

	it("applies editor view flags without document mutations", () => {
		const state = createInitialState();
		const next = applyEditorViewFlags(state, {
			previewSticky: false,
			animationPreviewEnabled: true,
			focusedMode: null,
		});

		expect(next.document).toBe(state.document);
		expect(next.ui.previewSticky).toBe(false);
		expect(next.ui.animationPreview.enabled).toBe(true);
		expect(next.ui.focusedMode).toBeNull();
		expect(next.ui.inspectorCollapsed).toBe(false);
	});

	it("applies typed panel requests while preserving default panel placement", () => {
		const state = createDefaultEditorPanelState({
			componentsPosition: { top: 10, left: 20 },
			pagesPosition: { top: 30, left: 40 },
		});
		const componentsOpen = applyEditorPanelRequest(state, {
			type: "open",
			panel: "components",
		});
		const pagesOpen = applyEditorPanelRequest(componentsOpen, {
			type: "openPages",
			pageId: "page-home",
			tab: "settings",
		});
		const settingsOpen = applyEditorPanelRequest(pagesOpen, {
			type: "openSettingsSection",
			section: "transfer",
		});

		expect(settingsOpen.componentsOpen).toBe(true);
		expect(settingsOpen.componentsPosition).toEqual({ top: 10, left: 20 });
		expect(settingsOpen.pagesOpen).toBe(true);
		expect(settingsOpen.requestedPageSettingsId).toBe("page-home");
		expect(settingsOpen.pagesPanelTabTarget).toBe("settings");
		expect(settingsOpen.settingsOpen).toBe(true);
		expect(settingsOpen.settingsSectionTarget).toBe("transfer");

		expect(
			applyEditorPanelRequest(settingsOpen, { type: "closeAll" }),
		).toMatchObject({
			settingsOpen: false,
			componentsOpen: false,
			pagesOpen: false,
		});
	});
});

describe("api/editorNavigationApi/panelState", () => {
	it("returns the documented default panel state shape", () => {
		expect(createDefaultEditorPanelState()).toEqual({
			settingsOpen: false,
			manageFontsOpen: false,
			helpOpen: false,
			shortcutsOpen: false,
			aboutOpen: false,
			componentsOpen: false,
			pagesOpen: false,
			sectionTemplateOpen: false,
			containerTypeOpen: false,
			textTypeOpen: false,
			mediaTypeOpen: false,
			aiOpen: false,
			componentsPosition: { top: 76, left: 80 },
			pagesPosition: { top: 76, left: 416 },
			componentsPositionCustomized: false,
			pagesPositionCustomized: false,
			pagesPanelTabTarget: "page",
			requestedPageSettingsId: null,
		});
	});

	it("uses provided positions when overriding panel defaults", () => {
		const state = createDefaultEditorPanelState({
			componentsPosition: { top: 1, left: 2 },
			pagesPosition: { top: 3, left: 4 },
		});
		expect(state.componentsPosition).toEqual({ top: 1, left: 2 });
		expect(state.pagesPosition).toEqual({ top: 3, left: 4 });
	});

	it("opens each panel kind via an 'open' request", () => {
		const state = createDefaultEditorPanelState();

		expect(applyEditorPanelRequest(state, { type: "open", panel: "settings" }).settingsOpen).toBe(true);
		expect(applyEditorPanelRequest(state, { type: "open", panel: "manageFonts" }).manageFontsOpen).toBe(true);
		expect(applyEditorPanelRequest(state, { type: "open", panel: "help" }).helpOpen).toBe(true);
		expect(applyEditorPanelRequest(state, { type: "open", panel: "shortcuts" }).shortcutsOpen).toBe(true);
		expect(applyEditorPanelRequest(state, { type: "open", panel: "about" }).aboutOpen).toBe(true);
		expect(applyEditorPanelRequest(state, { type: "open", panel: "sectionTemplates" }).sectionTemplateOpen).toBe(
			true,
		);
		expect(applyEditorPanelRequest(state, { type: "open", panel: "textTypes" }).textTypeOpen).toBe(true);
		expect(applyEditorPanelRequest(state, { type: "open", panel: "mediaTypes" }).mediaTypeOpen).toBe(true);
		expect(applyEditorPanelRequest(state, { type: "open", panel: "ai" }).aiOpen).toBe(true);
	});

	it("marks components/pages positions as customized only when a position is provided", () => {
		const state = createDefaultEditorPanelState();

		const openedWithoutPosition = applyEditorPanelRequest(state, {
			type: "open",
			panel: "components",
		});
		expect(openedWithoutPosition.componentsOpen).toBe(true);
		expect(openedWithoutPosition.componentsPosition).toEqual(state.componentsPosition);
		expect(openedWithoutPosition.componentsPositionCustomized).toBe(false);

		const openedWithPosition = applyEditorPanelRequest(state, {
			type: "open",
			panel: "components",
			position: { top: 5, left: 6 },
		});
		expect(openedWithPosition.componentsPosition).toEqual({ top: 5, left: 6 });
		expect(openedWithPosition.componentsPositionCustomized).toBe(true);

		const pagesOpenedWithPosition = applyEditorPanelRequest(state, {
			type: "open",
			panel: "pages",
			position: { top: 7, left: 8 },
		});
		expect(pagesOpenedWithPosition.pagesPosition).toEqual({ top: 7, left: 8 });
		expect(pagesOpenedWithPosition.pagesPositionCustomized).toBe(true);
	});

	it("closes each panel kind via a 'close' request", () => {
		const state = createDefaultEditorPanelState();

		const panelsAndFlags = [
			["settings", "settingsOpen"],
			["manageFonts", "manageFontsOpen"],
			["help", "helpOpen"],
			["shortcuts", "shortcutsOpen"],
			["about", "aboutOpen"],
			["components", "componentsOpen"],
			["pages", "pagesOpen"],
			["sectionTemplates", "sectionTemplateOpen"],
			["textTypes", "textTypeOpen"],
			["mediaTypes", "mediaTypeOpen"],
			["ai", "aiOpen"],
		] as const;

		for (const [panel, flag] of panelsAndFlags) {
			const openedState = applyEditorPanelRequest(state, { type: "open", panel });
			expect((openedState as Record<string, unknown>)[flag]).toBe(true);
			const closedState = applyEditorPanelRequest(openedState, { type: "close", panel });
			expect((closedState as Record<string, unknown>)[flag]).toBe(false);
		}
	});

	it("toggles components, pages, manageFonts, and ai panels open and closed", () => {
		const state = createDefaultEditorPanelState();

		const componentsToggledOpen = applyEditorPanelRequest(state, { type: "toggle", panel: "components" });
		expect(componentsToggledOpen.componentsOpen).toBe(true);
		const componentsToggledClosed = applyEditorPanelRequest(componentsToggledOpen, {
			type: "toggle",
			panel: "components",
		});
		expect(componentsToggledClosed.componentsOpen).toBe(false);

		const pagesToggledOpen = applyEditorPanelRequest(state, { type: "toggle", panel: "pages" });
		expect(pagesToggledOpen.pagesOpen).toBe(true);
		const pagesToggledClosed = applyEditorPanelRequest(pagesToggledOpen, { type: "toggle", panel: "pages" });
		expect(pagesToggledClosed.pagesOpen).toBe(false);

		const aiToggledOpen = applyEditorPanelRequest(state, { type: "toggle", panel: "ai" });
		expect(aiToggledOpen.aiOpen).toBe(true);
		const aiToggledClosed = applyEditorPanelRequest(aiToggledOpen, { type: "toggle", panel: "ai" });
		expect(aiToggledClosed.aiOpen).toBe(false);

		const fontsToggledOpen = applyEditorPanelRequest(state, { type: "toggle", panel: "manageFonts" });
		expect(fontsToggledOpen.manageFontsOpen).toBe(true);
		const fontsToggledClosed = applyEditorPanelRequest(fontsToggledOpen, {
			type: "toggle",
			panel: "manageFonts",
		});
		expect(fontsToggledClosed.manageFontsOpen).toBe(false);
	});

	it("closes every panel flag via a 'closeAll' request", () => {
		let state = createDefaultEditorPanelState();
		for (const panel of [
			"settings",
			"manageFonts",
			"help",
			"shortcuts",
			"about",
			"components",
			"pages",
			"sectionTemplates",
			"textTypes",
			"mediaTypes",
			"ai",
		] as const) {
			state = applyEditorPanelRequest(state, { type: "open", panel });
		}

		const closed = applyEditorPanelRequest(state, { type: "closeAll" });
		expect(closed).toMatchObject({
			settingsOpen: false,
			manageFontsOpen: false,
			helpOpen: false,
			shortcutsOpen: false,
			aboutOpen: false,
			componentsOpen: false,
			pagesOpen: false,
			sectionTemplateOpen: false,
			textTypeOpen: false,
			mediaTypeOpen: false,
			aiOpen: false,
		});
	});

	it("opens the settings panel targeted at a specific section via 'openSettingsSection'", () => {
		const state = createDefaultEditorPanelState();
		const next = applyEditorPanelRequest(state, {
			type: "openSettingsSection",
			section: "fonts",
		});
		expect(next.settingsOpen).toBe(true);
		expect(next.settingsSectionTarget).toBe("fonts");
	});

	it("opens the help panel targeted at a specific entry via 'openHelpEntry'", () => {
		const state = createDefaultEditorPanelState();
		const next = applyEditorPanelRequest(state, {
			type: "openHelpEntry",
			entryId: "doc:docs/API.md",
		});
		expect(next.helpOpen).toBe(true);
		expect(next.helpEntryTarget).toBe("doc:docs/API.md");

		const nextWithoutEntry = applyEditorPanelRequest(state, { type: "openHelpEntry" });
		expect(nextWithoutEntry.helpOpen).toBe(true);
		expect(nextWithoutEntry.helpEntryTarget).toBeUndefined();
	});

	it("opens the pages panel with requested page id and tab via 'openPages'", () => {
		const state = createDefaultEditorPanelState();
		const next = applyEditorPanelRequest(state, {
			type: "openPages",
			pageId: "page-about",
			tab: "settings",
			position: { top: 11, left: 22 },
		});
		expect(next.pagesOpen).toBe(true);
		expect(next.requestedPageSettingsId).toBe("page-about");
		expect(next.pagesPanelTabTarget).toBe("settings");
		expect(next.pagesPosition).toEqual({ top: 11, left: 22 });

		const nextWithDefaults = applyEditorPanelRequest(state, { type: "openPages" });
		expect(nextWithDefaults.requestedPageSettingsId).toBeNull();
		expect(nextWithDefaults.pagesPanelTabTarget).toBe("page");
	});

	it("returns the same state reference for an unrecognized request kind", () => {
		const state = createDefaultEditorPanelState();
		const next = applyEditorPanelRequest(
			state,
			{ type: "unknownRequestKind" } as never,
		);
		expect(next).toBe(state);
	});

	it("returns the same state reference for an unrecognized panel id on open/close", () => {
		const state = createDefaultEditorPanelState();
		const openedUnknown = applyEditorPanelRequest(state, {
			type: "open",
			panel: "unknownPanel" as never,
		});
		expect(openedUnknown).toBe(state);

		const closedUnknown = applyEditorPanelRequest(state, {
			type: "close",
			panel: "unknownPanel" as never,
		});
		expect(closedUnknown).toBe(state);
	});
});
