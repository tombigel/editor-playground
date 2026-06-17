import { describe, expect, it } from "vitest";
import { buildAppHash, parseAppRoute } from "../appRouting";

describe("app/appRouting", () => {
	it("routes clean and unknown hashes to onboarding", () => {
		expect(parseAppRoute("").mode).toBe("home");
		expect(parseAppRoute("#/").mode).toBe("home");
		expect(parseAppRoute("#/missing").mode).toBe("home");
	});

	it("routes app modes by hash path", () => {
		expect(parseAppRoute("#/edit").mode).toBe("edit");
		expect(parseAppRoute("#/preview").mode).toBe("preview");
		expect(parseAppRoute("#/design-system").mode).toBe("design-system");
	});

	it("parses editor hash search params", () => {
		const route = parseAppRoute("#/edit?tour=start&step=welcome");

		expect(route.mode).toBe("edit");
		expect(route.search.get("tour")).toBe("start");
		expect(route.search.get("step")).toBe("welcome");
	});

	it("keeps design-system section hashes out of route search", () => {
		const route = parseAppRoute("#/design-system#base-switch");

		expect(route.mode).toBe("design-system");
		expect([...route.search]).toEqual([]);
	});

	it("builds supported app hash URLs", () => {
		expect(buildAppHash("edit")).toBe("#/edit");
		expect(buildAppHash("preview")).toBe("#/preview");
		expect(buildAppHash("edit", "tour=start")).toBe("#/edit?tour=start");
	});
});
