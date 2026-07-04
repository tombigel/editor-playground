import {
	applyEditorPanelRequest,
	type EditorPagesPanelTab,
	type EditorPanelPosition,
	type EditorPanelRequest,
	type EditorPanelState,
	type EditorSettingsSectionId,
} from "@/api/editorNavigationApi";

export type PanelRequestCallbacks = {
	onSettingsOpenChange: (open: boolean) => void;
	onManageFontsOpenChange: (open: boolean) => void;
	onHelpOpenChange: (open: boolean) => void;
	onShortcutsOpenChange: (open: boolean) => void;
	onAboutOpenChange: (open: boolean) => void;
	onComponentsOpenChange: (open: boolean) => void;
	onComponentsPositionChange: (position: EditorPanelPosition) => void;
	onPagesOpenChange: (open: boolean) => void;
	onPagesPositionChange: (position: EditorPanelPosition) => void;
	onSectionTemplatesOpenChange: (open: boolean) => void;
	onTextTypesOpenChange: (open: boolean) => void;
	onAiOpenChange: (open: boolean) => void;
	onSettingsSectionTargetChange: (section: EditorSettingsSectionId) => void;
	onHelpEntryTargetChange: (entryId: string | undefined) => void;
	onPagesPanelTabTargetChange: (tab: EditorPagesPanelTab) => void;
	onRequestedPageSettingsIdChange: (pageId: string | null) => void;
};

/**
 * Applies an `EditorPanelRequest` through the pure `applyEditorPanelRequest`
 * helper and forwards the resulting state changes to the app shell's React
 * setters. This keeps request semantics in exactly one place: consumers that
 * hold `EditorPanelState` directly (`useAppPanels`) and consumers that hold
 * individual open flags (the showcase tour controller via `AppShell`) both
 * resolve requests through the same pure function.
 */
export function applyPanelRequestWithCallbacks(
	current: EditorPanelState,
	request: EditorPanelRequest,
	callbacks: PanelRequestCallbacks,
): EditorPanelState {
	const next = applyEditorPanelRequest(current, request);
	if (next.settingsOpen !== current.settingsOpen) {
		callbacks.onSettingsOpenChange(next.settingsOpen);
	}
	if (next.manageFontsOpen !== current.manageFontsOpen) {
		callbacks.onManageFontsOpenChange(next.manageFontsOpen);
	}
	if (next.helpOpen !== current.helpOpen) {
		callbacks.onHelpOpenChange(next.helpOpen);
	}
	if (next.shortcutsOpen !== current.shortcutsOpen) {
		callbacks.onShortcutsOpenChange(next.shortcutsOpen);
	}
	if (next.aboutOpen !== current.aboutOpen) {
		callbacks.onAboutOpenChange(next.aboutOpen);
	}
	if (next.componentsOpen !== current.componentsOpen) {
		callbacks.onComponentsOpenChange(next.componentsOpen);
	}
	if (next.componentsPosition !== current.componentsPosition) {
		callbacks.onComponentsPositionChange(next.componentsPosition);
	}
	if (next.pagesOpen !== current.pagesOpen) {
		callbacks.onPagesOpenChange(next.pagesOpen);
	}
	if (next.pagesPosition !== current.pagesPosition) {
		callbacks.onPagesPositionChange(next.pagesPosition);
	}
	if (next.sectionTemplateOpen !== current.sectionTemplateOpen) {
		callbacks.onSectionTemplatesOpenChange(next.sectionTemplateOpen);
	}
	if (next.textTypeOpen !== current.textTypeOpen) {
		callbacks.onTextTypesOpenChange(next.textTypeOpen);
	}
	if (next.aiOpen !== current.aiOpen) {
		callbacks.onAiOpenChange(next.aiOpen);
	}
	if (
		next.settingsSectionTarget !== current.settingsSectionTarget &&
		next.settingsSectionTarget !== undefined
	) {
		callbacks.onSettingsSectionTargetChange(next.settingsSectionTarget);
	}
	if (next.helpEntryTarget !== current.helpEntryTarget) {
		callbacks.onHelpEntryTargetChange(next.helpEntryTarget);
	}
	if (next.pagesPanelTabTarget !== current.pagesPanelTabTarget) {
		callbacks.onPagesPanelTabTargetChange(next.pagesPanelTabTarget);
	}
	if (next.requestedPageSettingsId !== current.requestedPageSettingsId) {
		callbacks.onRequestedPageSettingsIdChange(next.requestedPageSettingsId);
	}
	return next;
}
