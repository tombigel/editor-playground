import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OnboardingHome } from "../OnboardingHome";
import {
	API_VERSION,
	DOCUMENT_MODEL_VERSION,
	EDITOR_VERSION,
	PROJECT_VERSION,
} from "@/lib/version";

function renderHome(hasCurrentSite: boolean) {
	return renderToStaticMarkup(
		<OnboardingHome
			hasCurrentSite={hasCurrentSite}
			onContinueCurrentSite={() => undefined}
			onStartBlank={() => undefined}
			onLoadJson={() => undefined}
			onStartTour={() => undefined}
			onOpenDesignSystem={() => undefined}
		/>,
	);
}

describe("app/OnboardingHome", () => {
	it("renders the logo, versions, and startup actions", () => {
		const markup = renderHome(false);

		expect(markup).toContain("editor-playground-logo-one-line.svg");
		expect(markup).toContain(PROJECT_VERSION);
		expect(markup).toContain(DOCUMENT_MODEL_VERSION);
		expect(markup).toContain(API_VERSION);
		expect(markup).toContain(EDITOR_VERSION);
		expect(markup).toContain("Start blank");
		expect(markup).toContain("Load JSON");
		expect(markup).toContain("Start tour");
		expect(markup).toContain("Design system");
		expect(markup).not.toContain("Continue current site");
	});

	it("shows continue when a current site is available", () => {
		const markup = renderHome(true);

		expect(markup).toContain("Continue current site");
	});
});
