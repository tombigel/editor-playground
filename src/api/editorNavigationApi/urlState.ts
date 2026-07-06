import { isActiveFocusedMode } from "../../editor/focusedModes";
import type { FocusedMode } from "../../editor/types";
import type {
	EditorNavigationUrlState,
	EditorPagesPanelTab,
	EditorPanelId,
	EditorSettingsSectionId,
} from "./types";

export function parseEditorNavigationSearch(
	search: string | URLSearchParams | null | undefined,
): EditorNavigationUrlState {
	const params =
		search instanceof URLSearchParams
			? search
			: new URLSearchParams(normalizeSearch(search));
	const state: EditorNavigationUrlState = {};
	const activePageId = readString(params, "page");
	const selectedNodeId = readString(params, "select");
	const focusedMode = readFocusedMode(params.get("focus-mode"));
	const panel = readPanelId(params.get("panel"));
	const settingsSection = readSettingsSectionId(params.get("settings"));
	const helpEntryId = readString(params, "help");
	const pageTargetId = readString(params, "page-target");
	const pagesTab = readPagesTab(params.get("pages-tab"));
	const tourTopic = readString(params, "tour");
	const tourStep = readString(params, "step");

	if (activePageId) state.activePageId = activePageId;
	if (selectedNodeId) state.selectedNodeId = selectedNodeId;
	if (focusedMode !== undefined) state.focusedMode = focusedMode;
	if (panel) state.panel = panel;
	if (settingsSection) state.settingsSection = settingsSection;
	if (helpEntryId) state.helpEntryId = helpEntryId;
	if (pageTargetId) state.pageTargetId = pageTargetId;
	if (pagesTab) state.pagesTab = pagesTab;
	if (tourTopic) state.tourTopic = tourTopic;
	if (tourStep) state.tourStep = tourStep;

	assignBooleanParam(state, "showHidden", params, "show-hidden");
	assignBooleanParam(state, "previewSticky", params, "sticky-preview");
	assignBooleanParam(state, "animationPreviewEnabled", params, "animation-preview");
	assignBooleanParam(state, "showGridLanes", params, "grid");
	assignBooleanParam(state, "showDebugInfo", params, "debug");

	const spacerVisibility = params.get("spacers");
	if (spacerVisibility === "all" || spacerVisibility === "selected") {
		state.spacerVisibility = spacerVisibility;
	}

	return state;
}

export function buildEditorNavigationSearch(
	state: EditorNavigationUrlState,
	baseSearch: string | URLSearchParams | null | undefined = "",
): string {
	const params =
		baseSearch instanceof URLSearchParams
			? new URLSearchParams(baseSearch)
			: new URLSearchParams(normalizeSearch(baseSearch));

	writeString(params, "page", state.activePageId);
	writeString(params, "select", state.selectedNodeId);
	writeFocusedMode(params, state.focusedMode);
	writeString(params, "panel", state.panel);
	writeString(params, "settings", state.settingsSection);
	writeString(params, "help", state.helpEntryId);
	writeString(params, "page-target", state.pageTargetId);
	writeString(params, "pages-tab", state.pagesTab);
	writeString(params, "tour", state.tourTopic);
	writeString(params, "step", state.tourStep);
	writeBoolean(params, "show-hidden", state.showHidden);
	writeBoolean(params, "sticky-preview", state.previewSticky);
	writeBoolean(params, "animation-preview", state.animationPreviewEnabled);
	writeBoolean(params, "grid", state.showGridLanes);
	writeBoolean(params, "debug", state.showDebugInfo);
	writeString(params, "spacers", state.spacerVisibility);

	const serialized = params.toString();
	return serialized ? `?${serialized}` : "";
}

function normalizeSearch(search: string | null | undefined) {
	if (!search) {
		return "";
	}
	return search.startsWith("?") ? search.slice(1) : search;
}

function readString(params: URLSearchParams, key: string) {
	const value = params.get(key)?.trim();
	return value || undefined;
}

function readFocusedMode(value: string | null): FocusedMode | undefined {
	if (value == null) return undefined;
	const normalized = value.trim().toLowerCase();
	if (!normalized || normalized === "normal" || normalized === "none") return null;
	return isActiveFocusedMode(normalized) ? normalized : undefined;
}

function readPanelId(value: string | null): EditorPanelId | undefined {
	const normalized = value?.trim();
	return isEditorPanelId(normalized) ? normalized : undefined;
}

function readSettingsSectionId(
	value: string | null,
): EditorSettingsSectionId | undefined {
	const normalized = value?.trim();
	return isEditorSettingsSectionId(normalized) ? normalized : undefined;
}

function readPagesTab(value: string | null): EditorPagesPanelTab | undefined {
	return value === "page" || value === "settings" ? value : undefined;
}

function assignBooleanParam(
	target: EditorNavigationUrlState,
	property: keyof Pick<
		EditorNavigationUrlState,
		| "showHidden"
		| "previewSticky"
		| "animationPreviewEnabled"
		| "showGridLanes"
		| "showDebugInfo"
	>,
	params: URLSearchParams,
	key: string,
) {
	const value = readBoolean(params.get(key));
	if (value !== undefined) {
		target[property] = value;
	}
}

function readBoolean(value: string | null): boolean | undefined {
	if (value == null) return undefined;
	const normalized = value.trim().toLowerCase();
	if (["1", "true", "yes", "on"].includes(normalized)) return true;
	if (["0", "false", "no", "off"].includes(normalized)) return false;
	return undefined;
}

function writeString(
	params: URLSearchParams,
	key: string,
	value: string | null | undefined,
) {
	if (value == null || value === "") {
		params.delete(key);
		return;
	}
	params.set(key, value);
}

function writeFocusedMode(params: URLSearchParams, value: FocusedMode | undefined) {
	if (value === undefined) return;
	params.set("focus-mode", value ?? "none");
}

function writeBoolean(
	params: URLSearchParams,
	key: string,
	value: boolean | undefined,
) {
	if (value === undefined) return;
	params.set(key, value ? "1" : "0");
}

function isEditorPanelId(value: unknown): value is EditorPanelId {
	return (
		value === "settings" ||
		value === "manageFonts" ||
		value === "help" ||
		value === "shortcuts" ||
		value === "about" ||
		value === "components" ||
		value === "pages" ||
		value === "sectionTemplates" ||
		value === "containerTypes" ||
		value === "textTypes" ||
		value === "mediaTypes" ||
		value === "ai"
	);
}

function isEditorSettingsSectionId(
	value: unknown,
): value is EditorSettingsSectionId {
	return (
		value === "display" ||
		value === "pages" ||
		value === "defaults" ||
		value === "fonts" ||
		value === "transfer" ||
		value === "advanced" ||
		value === "shortcuts"
	);
}
