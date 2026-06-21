import { describe, expect, it } from "vitest";
import { parsePersistedThemeConfig } from "../useDesignSystemTheme";
import {
	DESIGN_SYSTEM_EDITOR_ROUTE_HASH,
	getDesignSystemBackRouteHash,
	parseStoredDesignSystemThemeConfig,
} from "@/lib/designSystem";

describe("design-system/useDesignSystemTheme", () => {
	it("parses the current editor theme fields from persisted state", () => {
		const parsed = parsePersistedThemeConfig(
			JSON.stringify({
				ui: {
					themeMode: "light",
					lightTheme: "paper",
					darkTheme: "ink",
					accentColor: "#a36a2c",
				},
			}),
		);

		expect(parsed).toEqual({
			themeMode: "light",
			lightTheme: "paper",
			darkTheme: "ink",
			accentColor: "#a36a2c",
		});
	});

	it("returns null for invalid persisted payloads", () => {
		expect(parsePersistedThemeConfig(null)).toBeNull();
		expect(parsePersistedThemeConfig("{invalid}")).toBeNull();
		expect(parsePersistedThemeConfig(JSON.stringify({ nope: true }))).toBeNull();
	});

	it("parses design system owned theme storage", () => {
		const parsed = parseStoredDesignSystemThemeConfig(
			JSON.stringify({
				themeMode: "dark",
				lightTheme: "clarity",
				darkTheme: "ink",
				accentColor: "#0f766e",
			}),
		);

		expect(parsed).toEqual({
			themeMode: "dark",
			lightTheme: "clarity",
			darkTheme: "ink",
			accentColor: "#0f766e",
		});
	});

	it("routes the showcase back button to the editor only for editor-origin launches", () => {
		expect(getDesignSystemBackRouteHash(DESIGN_SYSTEM_EDITOR_ROUTE_HASH)).toBe(
			"#/edit",
		);
		expect(
			getDesignSystemBackRouteHash("#/design-system?from=editor#base-switch"),
		).toBe("#/edit");
		expect(getDesignSystemBackRouteHash("#/design-system")).toBe("#/");
	});
});
