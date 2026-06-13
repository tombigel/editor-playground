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
