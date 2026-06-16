import {
	DEFAULT_EDITOR_ACCENT_COLOR,
	DEFAULT_EDITOR_DARK_THEME,
	DEFAULT_EDITOR_LIGHT_THEME,
	normalizeEditorAccentColor,
	normalizeEditorDarkTheme,
	normalizeEditorLightTheme,
	normalizeThemeMode,
} from "../lib/theme";
import { DOCUMENT_MODEL_VERSION } from "../lib/version";
import { createInitialDocument } from "../model/defaults";
import type { DocumentModel } from "../model/types";
import { validateDocument } from "../model/validation";
import { normalizeDocument } from "./editorDocumentNormalization";
import {
	normalizeFocusedMode,
	resolveFocusedModeUrlOverride,
} from "./focusedModes";
import {
	DEFAULT_FOCUSED_PANEL_OFFSET,
	normalizeFocusedPanelOffset,
} from "./focusedPanelPosition";
import { normalizeSelectedIds } from "./selection";
import type { EditorState } from "./types";
import { DEFAULT_SNAP_SETTINGS } from "./types";

export const STORAGE_KEY = "editor-playground.editor-state.v2";
export const DEFAULT_DOCUMENT_STORAGE_KEY =
	"editor-playground.default-document.v1";

export function createInitialState(): EditorState {
	const ui = createDefaultUiState();
	const focusedModeOverride = resolveFocusedModeUrlOverride(
		typeof window !== "undefined"
			? (window as Window & { location?: { search?: string } }).location?.search
			: undefined,
	);
	const startupFocusedMode =
		focusedModeOverride === undefined
			? ui.startupFocusedMode
			: focusedModeOverride;
	const document = loadDefaultDocument();
	return {
		document,
		activePageId: document.pages?.[0]?.id ?? null,
		selectedId: null,
		selectedIds: [],
		pendingRoleSwap: null,
		ui: {
			...ui,
			focusedMode: startupFocusedMode,
			startupFocusedMode,
			inspectorCollapsed: startupFocusedMode ? true : ui.inspectorCollapsed,
		},
	};
}

function normalizePersistedState(parsed: EditorState): EditorState | null {
	const normalizedDocument = normalizeDocument(parsed.document);
	const persistedStartupFocusedMode = normalizeFocusedMode(
		parsed.ui?.startupFocusedMode,
	);
	const focusedModeOverride = resolveFocusedModeUrlOverride(
		typeof window !== "undefined"
			? (window as Window & { location?: { search?: string } }).location?.search
			: undefined,
	);
	const startupFocusedMode =
		focusedModeOverride === undefined
			? persistedStartupFocusedMode
			: focusedModeOverride;
	const selectedIds = normalizeSelectedIds(
		normalizedDocument,
		Array.isArray((parsed as Partial<EditorState>).selectedIds)
			? (parsed as Partial<EditorState>).selectedIds
			: undefined,
		parsed.selectedId,
	);
	const themeMode = normalizeThemeMode(parsed.ui?.themeMode);
	const lightTheme = normalizeEditorLightTheme(parsed.ui?.lightTheme);
	const darkTheme = normalizeEditorDarkTheme(parsed.ui?.darkTheme);
	const candidate: EditorState = {
		...parsed,
		document: normalizedDocument,
		activePageId:
			parsed.activePageId ?? normalizedDocument.pages?.[0]?.id ?? null,
		selectedId: selectedIds[0] ?? null,
		selectedIds,
		pendingRoleSwap: null,
		ui: {
			showHidden: parsed.ui?.showHidden ?? true,
			previewSticky: parsed.ui?.previewSticky ?? true,
			animationPreview: parsed.ui?.animationPreview ?? {
				enabled: false,
				mode: "passive",
				triggers: {
					entrance: true,
					ongoing: true,
					scroll: true,
					mouse: true,
					click: true,
					hover: true,
				},
			},
			spacerVisibility:
				parsed.ui?.spacerVisibility === "all" ||
				parsed.ui?.spacerVisibility === "selected"
					? parsed.ui.spacerVisibility
					: "selected",
			showGridLanes: parsed.ui?.showGridLanes ?? false,
			showDebugInfo: parsed.ui?.showDebugInfo ?? false,
			snapSettings: normalizeSnapSettings(parsed.ui),
			themeMode,
			accentColor: normalizePersistedAccentColor(
				parsed.ui,
				themeMode,
				lightTheme,
				darkTheme,
			),
			lightTheme,
			darkTheme,
			focusedMode: startupFocusedMode,
			startupFocusedMode,
			inspectorCollapsed: startupFocusedMode
				? true
				: (parsed.ui?.inspectorCollapsed ?? false),
			temporaryInspectorOpen: false,
			focusedPanelOffset: normalizeFocusedPanelOffset(
				parsed.ui?.focusedPanelOffset,
			),
		},
	};
	const errors = validateDocument(candidate.document);
	if (errors.length > 0) {
		return null;
	}
	return candidate;
}

export function loadPersistedState(): EditorState {
	if (typeof window === "undefined") {
		return createInitialState();
	}

	try {
		ensureDefaultDocumentSeeded();

		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as EditorState;
			const normalized = normalizePersistedState(parsed);
			if (normalized) {
				return normalized;
			}
			return createInitialState();
		}

		return createInitialState();
	} catch {
		return createInitialState();
	}
}

export function persistState(state: EditorState) {
	if (typeof window === "undefined") {
		return;
	}
	window.localStorage.setItem(
		STORAGE_KEY,
		JSON.stringify({ ...state, pendingRoleSwap: null }),
	);
}

export function persistDefaultDocument(document: DocumentModel) {
	if (typeof window === "undefined") {
		return;
	}
	window.localStorage.setItem(
		DEFAULT_DOCUMENT_STORAGE_KEY,
		JSON.stringify(document),
	);
}

export function clearSessionState() {
	if (typeof window === "undefined") {
		return;
	}
	window.localStorage.removeItem(STORAGE_KEY);
}

export function clearPersistedState() {
	if (typeof window === "undefined") {
		return;
	}
	clearSessionState();
	window.localStorage.removeItem(DEFAULT_DOCUMENT_STORAGE_KEY);
}

export function createFactoryResetState(ui?: EditorState["ui"]): EditorState {
	const document = createInitialDocument();
	return {
		document,
		activePageId: document.pages?.[0]?.id ?? null,
		selectedId: null,
		selectedIds: [],
		pendingRoleSwap: null,
		ui: ui ? { ...ui, temporaryInspectorOpen: false } : createDefaultUiState(),
	};
}

function createDefaultUiState(): EditorState["ui"] {
	return {
		showHidden: true,
		previewSticky: true,
		animationPreview: {
			enabled: false,
			mode: "passive",
			triggers: {
				entrance: true,
				ongoing: true,
				scroll: true,
				mouse: true,
				click: true,
				hover: true,
			},
		},
		spacerVisibility: "selected",
		showGridLanes: false,
		showDebugInfo: false,
		snapSettings: DEFAULT_SNAP_SETTINGS,
		themeMode: "auto",
		accentColor: DEFAULT_EDITOR_ACCENT_COLOR,
		lightTheme: DEFAULT_EDITOR_LIGHT_THEME,
		darkTheme: DEFAULT_EDITOR_DARK_THEME,
		focusedMode: null,
		startupFocusedMode: null,
		inspectorCollapsed: false,
		temporaryInspectorOpen: false,
		focusedPanelOffset: DEFAULT_FOCUSED_PANEL_OFFSET,
	};
}

function normalizePersistedAccentColor(
	ui: Partial<EditorState["ui"]> | undefined,
	themeMode: EditorState["ui"]["themeMode"],
	lightTheme: EditorState["ui"]["lightTheme"],
	darkTheme: EditorState["ui"]["darkTheme"],
) {
	const legacyUi = ui as
		| (Partial<EditorState["ui"]> & {
				paperAccentColor?: unknown;
				monokaiAccentColor?: unknown;
		  })
		| undefined;
	if (themeMode === "light" && lightTheme === "paper") {
		return normalizeEditorAccentColor(legacyUi?.paperAccentColor);
	}
	if (themeMode === "dark" && darkTheme === "monokai") {
		return normalizeEditorAccentColor(legacyUi?.monokaiAccentColor);
	}
	return normalizeEditorAccentColor(ui?.accentColor);
}

export function parseImportedDocumentJson(raw: string): DocumentModel {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error("Import failed: invalid JSON.");
	}

	const storedVersion = (parsed as Record<string, unknown>)?.schemaVersion;
	if (
		typeof storedVersion === "string" &&
		storedVersion !== DOCUMENT_MODEL_VERSION
	) {
		console.warn(
			`[editor-playground] Document schema version mismatch: stored ${storedVersion}, current ${DOCUMENT_MODEL_VERSION}. Attempting import anyway.`,
		);
	}

	try {
		const document = normalizeDocument(parsed as DocumentModel);
		const errors = validateDocument(document);
		if (errors.length > 0) {
			throw new Error(`Import failed: ${errors.join("; ")}`);
		}
		return document;
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Import failed:")) {
			throw error;
		}
		throw new Error("Import failed: invalid document structure.");
	}
}

function loadDefaultDocument(): DocumentModel {
	if (typeof window === "undefined") {
		return createInitialDocument();
	}

	try {
		const raw = window.localStorage.getItem(DEFAULT_DOCUMENT_STORAGE_KEY);
		if (!raw) {
			return createInitialDocument();
		}
		const document = normalizeDocument(JSON.parse(raw) as DocumentModel);
		const errors = validateDocument(document);
		if (errors.length > 0) {
			return createInitialDocument();
		}
		return document;
	} catch {
		return createInitialDocument();
	}
}

function ensureDefaultDocumentSeeded() {
	if (typeof window === "undefined") {
		return;
	}

	if (window.localStorage.getItem(DEFAULT_DOCUMENT_STORAGE_KEY)) {
		return;
	}

	const persistedSession = window.localStorage.getItem(STORAGE_KEY);
	if (persistedSession) {
		try {
			const parsed = JSON.parse(persistedSession) as EditorState;
			const document = normalizeDocument(parsed.document);
			const errors = validateDocument(document);
			if (errors.length === 0) {
				window.localStorage.setItem(
					DEFAULT_DOCUMENT_STORAGE_KEY,
					JSON.stringify(document),
				);
				return;
			}
		} catch {
			// fall through to factory default
		}
	}

	window.localStorage.setItem(
		DEFAULT_DOCUMENT_STORAGE_KEY,
		JSON.stringify(createInitialDocument()),
	);
}

export function cloneDocument(document: DocumentModel): DocumentModel {
	return {
		rootId: document.rootId,
		nodes: structuredClone(document.nodes),
		fontLibrary: structuredClone(document.fontLibrary),
		...(document.animationSettings
			? { animationSettings: structuredClone(document.animationSettings) }
			: {}),
		...(document.pages ? { pages: structuredClone(document.pages) } : {}),
		...(document.siteSettings
			? { siteSettings: structuredClone(document.siteSettings) }
			: {}),
		...(document.sharedRegionIds
			? { sharedRegionIds: [...document.sharedRegionIds] }
			: {}),
	};
}

function normalizeSnapSettings(ui: Partial<EditorState["ui"]> | undefined) {
	// Migration: if old snapEnabled boolean exists and no snapSettings, derive from it
	const legacy = ui as Record<string, unknown> | undefined;
	if (legacy && "snapEnabled" in legacy && !("snapSettings" in legacy)) {
		const wasEnabled =
			typeof legacy.snapEnabled === "boolean" ? legacy.snapEnabled : true;
		return {
			guideSnap: { ...DEFAULT_SNAP_SETTINGS.guideSnap, enabled: wasEnabled },
			containerSnap: { ...DEFAULT_SNAP_SETTINGS.containerSnap },
		};
	}

	const persisted = ui?.snapSettings;
	if (!persisted) {
		return DEFAULT_SNAP_SETTINGS;
	}

	return {
		guideSnap: {
			enabled:
				persisted.guideSnap?.enabled ?? DEFAULT_SNAP_SETTINGS.guideSnap.enabled,
			threshold:
				persisted.guideSnap?.threshold ??
				DEFAULT_SNAP_SETTINGS.guideSnap.threshold,
			power:
				persisted.guideSnap?.power ?? DEFAULT_SNAP_SETTINGS.guideSnap.power,
			maxSpeedPxPerSecond:
				persisted.guideSnap?.maxSpeedPxPerSecond ??
				DEFAULT_SNAP_SETTINGS.guideSnap.maxSpeedPxPerSecond,
		},
		containerSnap: {
			enabled:
				persisted.containerSnap?.enabled ??
				DEFAULT_SNAP_SETTINGS.containerSnap.enabled,
			threshold:
				persisted.containerSnap?.threshold ??
				DEFAULT_SNAP_SETTINGS.containerSnap.threshold,
			power:
				persisted.containerSnap?.power ??
				DEFAULT_SNAP_SETTINGS.containerSnap.power,
		},
	};
}
