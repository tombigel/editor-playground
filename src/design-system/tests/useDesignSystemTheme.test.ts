import { describe, expect, it } from "vitest";
import { parsePersistedThemeConfig } from "../useDesignSystemTheme";

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
});
