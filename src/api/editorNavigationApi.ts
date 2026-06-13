/**
 * @module editorNavigationApi
 *
 * Headless editor navigation helpers. These APIs describe editor view/panel
 * movement without clicking DOM nodes, so tours, deep links, scripts, and the
 * normal editor shell can share the same state contract.
 */

export type {
	ApplyEditorNavigationOptions,
	EditorNavigationUrlState,
	EditorNodeTarget,
	EditorPagesPanelTab,
	EditorPanelId,
	EditorPanelPosition,
	EditorPanelRequest,
	EditorPanelState,
	EditorSettingsSectionId,
	EditorViewFlags,
} from "./editorNavigationApi/types";
export {
	applyEditorNavigationState,
	applyEditorViewFlags,
	resolveEditorNodeTarget,
} from "./editorNavigationApi/editorState";
export {
	applyEditorPanelRequest,
	createDefaultEditorPanelState,
} from "./editorNavigationApi/panelState";
export {
	buildEditorNavigationSearch,
	parseEditorNavigationSearch,
} from "./editorNavigationApi/urlState";
