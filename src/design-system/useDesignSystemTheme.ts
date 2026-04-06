import { useCallback, useMemo, useState } from "react";
import { useApplyEditorTheme } from "@/app/useEditorEnvironment";
import { STORAGE_KEY } from "@/editor/editorPersistence";
import {
	DEFAULT_EDITOR_ACCENT_COLOR,
	DEFAULT_EDITOR_DARK_THEME,
	DEFAULT_EDITOR_LIGHT_THEME,
	type EditorDarkTheme,
	type EditorLightTheme,
	getAccentColorForDarkThemeSelection,
	getAccentColorForLightThemeSelection,
	normalizeEditorAccentColor,
	normalizeEditorDarkTheme,
	normalizeEditorLightTheme,
	type ThemeMode,
	resolveEditorAccentColor,
	resolveThemeMode,
} from "@/lib/theme";
import { useSystemThemePreference } from "@/lib/useSystemThemePreference";
import type { ResolvedThemeConfig, ThemeConfig } from "./types";

function resolveConfig(
	config: ThemeConfig,
	systemPrefersDark: boolean,
): ResolvedThemeConfig {
	const resolved = resolveThemeMode(config.themeMode, systemPrefersDark);
	const resolvedAccent = resolveEditorAccentColor(config.accentColor);
	return { ...config, resolved, resolvedAccent };
}

export function parsePersistedThemeConfig(raw: string | null): ThemeConfig | null {
	if (!raw) {
		return null;
	}

	try {
		const ui = JSON.parse(raw)?.ui;
		if (!ui) {
			return null;
		}

		return {
			themeMode:
				ui.themeMode === "light" || ui.themeMode === "dark"
					? ui.themeMode
					: "auto",
			lightTheme: ui.lightTheme ?? DEFAULT_EDITOR_LIGHT_THEME,
			darkTheme: ui.darkTheme ?? DEFAULT_EDITOR_DARK_THEME,
			accentColor: ui.accentColor ?? DEFAULT_EDITOR_ACCENT_COLOR,
		};
	} catch {
		return null;
	}
}

function readCurrentDocumentThemeConfig(): ThemeConfig | null {
	if (typeof document === "undefined") {
		return null;
	}

	const root = document.documentElement;
	const body = document.body;
	const resolvedTheme = root.dataset.editorTheme ?? body?.dataset.editorTheme;
	const lightTheme = root.dataset.editorLightTheme ?? body?.dataset.editorLightTheme;
	const darkTheme = root.dataset.editorDarkTheme ?? body?.dataset.editorDarkTheme;
	const accentColor =
		root.style.getPropertyValue("--editor-accent").trim() ||
		body?.style.getPropertyValue("--editor-accent").trim() ||
		getComputedStyle(root).getPropertyValue("--editor-accent").trim() ||
		getComputedStyle(body ?? root).getPropertyValue("--editor-accent").trim();

	if (!resolvedTheme && !lightTheme && !darkTheme && !accentColor) {
		return null;
	}

	return {
		themeMode: resolvedTheme === "light" || resolvedTheme === "dark" ? resolvedTheme : "auto",
		lightTheme: normalizeEditorLightTheme(lightTheme ?? DEFAULT_EDITOR_LIGHT_THEME),
		darkTheme: normalizeEditorDarkTheme(darkTheme ?? DEFAULT_EDITOR_DARK_THEME),
		accentColor: normalizeEditorAccentColor(accentColor || DEFAULT_EDITOR_ACCENT_COLOR),
	};
}

/**
 * Reads the editor's persisted theme UI fields from localStorage and builds
 * a full ThemeConfig (used as the initial state for the showcase).
 */
function readPersistedThemeConfig(): ThemeConfig {
	const parsed = parsePersistedThemeConfig(localStorage.getItem(STORAGE_KEY));
	if (parsed) {
		return parsed;
	}

	return {
		themeMode: "auto",
		lightTheme: DEFAULT_EDITOR_LIGHT_THEME,
		darkTheme: DEFAULT_EDITOR_DARK_THEME,
		accentColor: DEFAULT_EDITOR_ACCENT_COLOR,
	};
}

function readInitialThemeConfig(): ThemeConfig {
	return readCurrentDocumentThemeConfig() ?? readPersistedThemeConfig();
}

/**
 * Single unified theme for the design system showcase.
 *
 * On mount, reads the editor's persisted theme settings from localStorage.
 * Local setters allow changing theme/palette/accent live — all changes apply
 * directly to document.body via useApplyEditorTheme().
 */
export function useDesignSystemTheme() {
	const systemPrefersDark = useSystemThemePreference();

	const [config, setConfig] = useState<ThemeConfig>(readInitialThemeConfig);

	const resolved = useMemo(
		() => resolveConfig(config, systemPrefersDark),
		[config, systemPrefersDark],
	);

	// Apply the theme to document.body (same mechanism the editor uses).
	useApplyEditorTheme(
		resolved.resolved,
		resolved.accentColor,
		resolved.lightTheme,
		resolved.darkTheme,
	);

	// Cache key for TokenSwatch recomputation when theme changes.
	const themeKey = `${resolved.resolved}-${resolved.lightTheme}-${resolved.darkTheme}-${resolved.resolvedAccent}`;

	const setThemeMode = useCallback((themeMode: ThemeMode) => {
		setConfig((prev) => ({ ...prev, themeMode }));
	}, []);

	const setLightTheme = useCallback((lightTheme: EditorLightTheme) => {
		setConfig((prev) => ({
			...prev,
			lightTheme,
			accentColor: getAccentColorForLightThemeSelection(lightTheme, prev.accentColor),
		}));
	}, []);

	const setDarkTheme = useCallback((darkTheme: EditorDarkTheme) => {
		setConfig((prev) => ({
			...prev,
			darkTheme,
			accentColor: getAccentColorForDarkThemeSelection(darkTheme, prev.accentColor),
		}));
	}, []);

	const setAccentColor = useCallback((accentColor: string) => {
		setConfig((prev) => ({ ...prev, accentColor }));
	}, []);

	return {
		config: resolved,
		themeKey,
		setThemeMode,
		setLightTheme,
		setDarkTheme,
		setAccentColor,
	};
}
