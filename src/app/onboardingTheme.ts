import { STORAGE_KEY } from "@/editor/editorPersistence";
import {
	DEFAULT_EDITOR_ACCENT_COLOR,
	normalizeEditorAccentColor,
	normalizeEditorDarkTheme,
	normalizeEditorLightTheme,
	normalizeThemeMode,
	type EditorDarkTheme,
	type EditorLightTheme,
	type ThemeMode,
} from "@/lib/theme";

type ThemeStorage = Pick<Storage, "getItem" | "setItem">;

export type OnboardingThemeConfig = {
	themeMode: ThemeMode;
	accentColor: string;
	lightTheme: EditorLightTheme;
	darkTheme: EditorDarkTheme;
};

export const ONBOARDING_FALLBACK_THEME_CONFIG: OnboardingThemeConfig = {
	themeMode: "auto",
	accentColor: DEFAULT_EDITOR_ACCENT_COLOR,
	lightTheme: "air",
	darkTheme: "graphite",
};

export function getInitialOnboardingThemeConfig(
	storage = getBrowserStorage(),
): OnboardingThemeConfig {
	return readStoredEditorThemeConfig(storage) ?? ONBOARDING_FALLBACK_THEME_CONFIG;
}

export function readStoredEditorThemeConfig(
	storage = getBrowserStorage(),
): OnboardingThemeConfig | null {
	const parsed = readStoredEditorState(storage);
	const ui = parsed?.ui;
	if (!ui || typeof ui !== "object") {
		return null;
	}
	const candidate = ui as Record<string, unknown>;
	return {
		themeMode: normalizeThemeMode(candidate.themeMode),
		accentColor: normalizeEditorAccentColor(candidate.accentColor),
		lightTheme: normalizeEditorLightTheme(candidate.lightTheme),
		darkTheme: normalizeEditorDarkTheme(candidate.darkTheme),
	};
}

export function writeStoredEditorThemeMode(
	themeMode: ThemeMode,
	storage = getBrowserStorage(),
) {
	if (!storage) {
		return false;
	}
	const parsed = readStoredEditorState(storage);
	if (!parsed) {
		return false;
	}
	const ui =
		parsed.ui && typeof parsed.ui === "object"
			? (parsed.ui as Record<string, unknown>)
			: {};
	storage.setItem(
		STORAGE_KEY,
		JSON.stringify({
			...parsed,
			ui: {
				...ui,
				themeMode,
			},
		}),
	);
	return true;
}

function readStoredEditorState(storage: ThemeStorage | null) {
	if (!storage) {
		return null;
	}
	const raw = storage.getItem(STORAGE_KEY);
	if (!raw) {
		return null;
	}
	try {
		const parsed = JSON.parse(raw) as unknown;
		return parsed && typeof parsed === "object"
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

function getBrowserStorage(): ThemeStorage | null {
	if (typeof window === "undefined") {
		return null;
	}
	return window.localStorage;
}
