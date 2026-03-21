import { useCallback, useMemo, useState } from "react";
import { useApplyEditorTheme } from "@/app/useEditorEnvironment";
import {
	DEFAULT_EDITOR_ACCENT_COLOR,
	DEFAULT_EDITOR_DARK_THEME,
	DEFAULT_EDITOR_LIGHT_THEME,
	DEFAULT_MONOKAI_ACCENT_COLOR,
	DEFAULT_PAPER_ACCENT_COLOR,
	type EditorDarkTheme,
	type EditorLightTheme,
	type ResolvedTheme,
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
	const resolvedAccent = resolveEditorAccentColor(
		config.accentColor,
		config.paperAccentColor,
		config.monokaiAccentColor,
		resolved,
		config.lightTheme,
		config.darkTheme,
	);
	return { ...config, resolved, resolvedAccent };
}

/**
 * Reads the editor's persisted theme UI fields from localStorage and builds
 * a full ThemeConfig (used as the initial state for the showcase).
 */
function readPersistedThemeConfig(): ThemeConfig {
	try {
		const raw = localStorage.getItem("sticky-playground.editor-state.v1");
		if (raw) {
			const ui = JSON.parse(raw)?.ui;
			if (ui) {
				return {
					themeMode:
						ui.themeMode === "light" || ui.themeMode === "dark"
							? ui.themeMode
							: "auto",
					lightTheme: ui.lightTheme ?? DEFAULT_EDITOR_LIGHT_THEME,
					darkTheme: ui.darkTheme ?? DEFAULT_EDITOR_DARK_THEME,
					accentColor: ui.accentColor ?? DEFAULT_EDITOR_ACCENT_COLOR,
					paperAccentColor: ui.paperAccentColor ?? DEFAULT_PAPER_ACCENT_COLOR,
					monokaiAccentColor:
						ui.monokaiAccentColor ?? DEFAULT_MONOKAI_ACCENT_COLOR,
				};
			}
		}
	} catch {
		// ignore
	}
	return {
		themeMode: "auto",
		lightTheme: DEFAULT_EDITOR_LIGHT_THEME,
		darkTheme: DEFAULT_EDITOR_DARK_THEME,
		accentColor: DEFAULT_EDITOR_ACCENT_COLOR,
		paperAccentColor: DEFAULT_PAPER_ACCENT_COLOR,
		monokaiAccentColor: DEFAULT_MONOKAI_ACCENT_COLOR,
	};
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

	const [config, setConfig] = useState<ThemeConfig>(readPersistedThemeConfig);

	const resolved = useMemo(
		() => resolveConfig(config, systemPrefersDark),
		[config, systemPrefersDark],
	);

	// Apply the theme to document.body (same mechanism the editor uses).
	useApplyEditorTheme(
		resolved.resolved,
		resolved.accentColor,
		resolved.paperAccentColor,
		resolved.monokaiAccentColor,
		resolved.lightTheme,
		resolved.darkTheme,
	);

	// Cache key for TokenSwatch recomputation when theme changes.
	const themeKey = `${resolved.resolved}-${resolved.lightTheme}-${resolved.darkTheme}-${resolved.resolvedAccent}`;

	const setThemeMode = useCallback((themeMode: ResolvedTheme) => {
		setConfig((prev) => ({ ...prev, themeMode }));
	}, []);

	const setLightTheme = useCallback((lightTheme: EditorLightTheme) => {
		setConfig((prev) => ({ ...prev, lightTheme }));
	}, []);

	const setDarkTheme = useCallback((darkTheme: EditorDarkTheme) => {
		setConfig((prev) => ({ ...prev, darkTheme }));
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
