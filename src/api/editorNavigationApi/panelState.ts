import type {
	EditorPanelId,
	EditorPanelPosition,
	EditorPanelRequest,
	EditorPanelState,
} from "./types";

export function createDefaultEditorPanelState(
	options: {
		componentsPosition: EditorPanelPosition;
		pagesPosition: EditorPanelPosition;
	} = {
		componentsPosition: { top: 76, left: 80 },
		pagesPosition: { top: 76, left: 416 },
	},
): EditorPanelState {
	return {
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
		componentsPosition: options.componentsPosition,
		pagesPosition: options.pagesPosition,
		componentsPositionCustomized: false,
		pagesPositionCustomized: false,
		pagesPanelTabTarget: "page",
		requestedPageSettingsId: null,
	};
}

export function applyEditorPanelRequest(
	state: EditorPanelState,
	request: EditorPanelRequest,
): EditorPanelState {
	switch (request.type) {
		case "open":
			return openPanel(state, request.panel, request.position);
		case "close":
			return closePanel(state, request.panel);
		case "toggle":
			return togglePanel(state, request.panel);
		case "closeAll":
			return closeAllPanels(state);
		case "openSettingsSection":
			return {
				...openPanel(state, "settings"),
				settingsSectionTarget: request.section,
			};
		case "openHelpEntry":
			return {
				...openPanel(state, "help"),
				helpEntryTarget: request.entryId,
			};
		case "openPages":
			return {
				...openPanel(state, "pages", request.position),
				requestedPageSettingsId: request.pageId ?? null,
				pagesPanelTabTarget: request.tab ?? "page",
			};
		default:
			return state;
	}
}

function togglePanel(
	state: EditorPanelState,
	panel: Extract<EditorPanelId, "components" | "pages" | "manageFonts" | "ai">,
) {
	if (panel === "components") {
		return state.componentsOpen
			? closePanel(state, "components")
			: openPanel(state, "components");
	}
	if (panel === "pages") {
		return state.pagesOpen ? closePanel(state, "pages") : openPanel(state, "pages");
	}
	if (panel === "ai") {
		return state.aiOpen ? closePanel(state, "ai") : openPanel(state, "ai");
	}
	return state.manageFontsOpen
		? closePanel(state, "manageFonts")
		: openPanel(state, "manageFonts");
}

function closeAllPanels(state: EditorPanelState): EditorPanelState {
	return {
		...state,
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
	};
}

function openPanel(
	state: EditorPanelState,
	panel: EditorPanelId,
	position?: EditorPanelPosition,
): EditorPanelState {
	switch (panel) {
		case "settings":
			return { ...state, settingsOpen: true };
		case "manageFonts":
			return { ...state, manageFontsOpen: true };
		case "help":
			return { ...state, helpOpen: true };
		case "shortcuts":
			return { ...state, shortcutsOpen: true };
		case "about":
			return { ...state, aboutOpen: true };
		case "components":
			return {
				...state,
				componentsOpen: true,
				componentsPosition: position ?? state.componentsPosition,
				componentsPositionCustomized:
					state.componentsPositionCustomized || Boolean(position),
			};
		case "pages":
			return {
				...state,
				pagesOpen: true,
				pagesPosition: position ?? state.pagesPosition,
				pagesPositionCustomized:
					state.pagesPositionCustomized || Boolean(position),
			};
		case "sectionTemplates":
			return { ...state, sectionTemplateOpen: true };
		case "textTypes":
			return { ...state, textTypeOpen: true };
		case "mediaTypes":
			return { ...state, mediaTypeOpen: true };
		case "ai":
			return { ...state, aiOpen: true };
		default:
			return state;
	}
}

function closePanel(state: EditorPanelState, panel: EditorPanelId): EditorPanelState {
	switch (panel) {
		case "settings":
			return { ...state, settingsOpen: false };
		case "manageFonts":
			return { ...state, manageFontsOpen: false };
		case "help":
			return { ...state, helpOpen: false };
		case "shortcuts":
			return { ...state, shortcutsOpen: false };
		case "about":
			return { ...state, aboutOpen: false };
		case "components":
			return { ...state, componentsOpen: false };
		case "pages":
			return { ...state, pagesOpen: false };
		case "sectionTemplates":
			return { ...state, sectionTemplateOpen: false };
		case "textTypes":
			return { ...state, textTypeOpen: false };
		case "mediaTypes":
			return { ...state, mediaTypeOpen: false };
		case "ai":
			return { ...state, aiOpen: false };
		default:
			return state;
	}
}
