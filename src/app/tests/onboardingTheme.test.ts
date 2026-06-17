import { describe, expect, it } from "vitest";
import { STORAGE_KEY } from "@/editor/editorPersistence";
import {
	getInitialOnboardingThemeConfig,
	ONBOARDING_FALLBACK_THEME_CONFIG,
	readStoredEditorThemeConfig,
	writeStoredEditorThemeMode,
} from "../onboardingTheme";

function createStorage(initial: Record<string, string> = {}) {
	const values = new Map(Object.entries(initial));
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		read: (key: string) => values.get(key) ?? null,
	};
}

describe("app/onboardingTheme", () => {
	it("falls back to Air and Graphite when no editor theme is stored", () => {
		const storage = createStorage();

		expect(getInitialOnboardingThemeConfig(storage)).toEqual(
			ONBOARDING_FALLBACK_THEME_CONFIG,
		);
	});

	it("reads the editor theme mode and keeps saved light/dark presets", () => {
		const storage = createStorage({
			[STORAGE_KEY]: JSON.stringify({
				ui: {
					themeMode: "dark",
					accentColor: "#0f766e",
					lightTheme: "paper",
					darkTheme: "monokai",
				},
			}),
		});

		expect(readStoredEditorThemeConfig(storage)).toEqual({
			themeMode: "dark",
			accentColor: "#0f766e",
			lightTheme: "paper",
			darkTheme: "monokai",
		});
	});

	it("writes only the editor theme mode and preserves theme presets", () => {
		const storage = createStorage({
			[STORAGE_KEY]: JSON.stringify({
				document: { rootId: "site", nodes: {} },
				ui: {
					themeMode: "auto",
					accentColor: "#7c3aed",
					lightTheme: "clarity",
					darkTheme: "ink",
				},
			}),
		});

		expect(writeStoredEditorThemeMode("light", storage)).toBe(true);

		expect(JSON.parse(storage.read(STORAGE_KEY) ?? "{}")).toMatchObject({
			document: { rootId: "site", nodes: {} },
			ui: {
				themeMode: "light",
				accentColor: "#7c3aed",
				lightTheme: "clarity",
				darkTheme: "ink",
			},
		});
	});

	it("does not create editor storage just to sync a clean welcome screen", () => {
		const storage = createStorage();

		expect(writeStoredEditorThemeMode("dark", storage)).toBe(false);
		expect(storage.read(STORAGE_KEY)).toBeNull();
	});
});
