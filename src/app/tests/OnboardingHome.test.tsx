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
			themeMode="auto"
			resolvedTheme="light"
			lightTheme="air"
			darkTheme="graphite"
			onThemeModeChange={() => undefined}
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

		expect(markup).toContain('aria-labelledby="onboarding-title"');
		expect(markup).toContain('data-editor-theme="light"');
		expect(markup).toContain('data-theme-mode="auto"');
		expect(markup).toContain('data-editor-light-theme="air"');
		expect(markup).toContain('data-editor-dark-theme="graphite"');
		expect(markup).toContain('data-ui="options-selector"');
		expect(markup).toContain("Welcome theme");
		expect(markup).toContain("Auto");
		expect(markup).toContain("Light");
		expect(markup).toContain("Dark");
		expect(markup).toContain('aria-label="Welcome actions"');
		expect(markup).toContain('id="onboarding-title"');
		expect(markup).toContain("Welcome to Editor Playground");
		expect(markup).toContain('data-onboarding-action="Start blank"');
		expect(markup).toContain("focus-visible:outline-2");
		expect(markup).toContain("var(--editor-focus-ring-strong)");
		expect(markup).toContain(
			"A working website editor built in under two months through developer-led, AI-assisted guided coding. It turns product, UI, UX, design-system, frontend, and prompting ideas into inspectable site-builder experiments, and keeps evolving against an active roadmap.",
		);
		expect(markup).toContain("Built by Tom Bigelajzen 2026");
		expect(markup).toContain("Project GitHub");
		expect(markup).toContain("https://github.com/tombigel/editor-playground");
		expect(markup).toContain('data-display="icon"');
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
		expect(markup.indexOf('data-onboarding-action="Start tour"')).toBeLessThan(
			markup.indexOf('data-onboarding-action="Start blank"'),
		);
		expect(markup).toContain('data-featured="true"');
		expect(markup).toContain("var(--editor-accent)_12%");
	});

	it("shows continue when a current site is available", () => {
		const markup = renderHome(true);

		expect(markup).toContain("Continue current site");
		expect(markup.indexOf('data-onboarding-action="Continue current site"')).toBeLessThan(
			markup.indexOf('data-onboarding-action="Start tour"'),
		);
		expect(markup).not.toContain('data-featured="true"');
	});
});
