import { describe, expect, it } from "vitest";
import {
	getAdjacentShowcaseTourStep,
	getShowcaseTourPanelRequests,
	getShowcaseTourStep,
	getShowcaseTourStepsForTopic,
	isLastShowcaseTourStep,
	resolveShowcaseTourLocation,
	validateShowcaseTourConfig,
	type ShowcaseTourConfig,
} from "../showcaseTourApi";

const config: ShowcaseTourConfig = {
	entryTopicId: "start",
	entryStepId: "welcome",
	topics: [
		{
			id: "start",
			label: "Start",
			description: "Entry",
			stepIds: ["welcome", "jump"],
		},
		{
			id: "api",
			label: "API",
			description: "Architecture",
			stepIds: ["url-state"],
		},
	],
	steps: [
		{
			id: "welcome",
			topicId: "start",
			title: "Welcome",
			body: "Intro",
			anchor: { type: "none" },
			navigation: {},
		},
		{
			id: "jump",
			topicId: "start",
			title: "Jump",
			body: "Menu",
			anchor: { type: "tourMenu" },
			navigation: {},
		},
		{
			id: "url-state",
			topicId: "api",
			title: "URL",
			body: "Deep link",
			anchor: { type: "selector", selector: "[data-api]" },
			navigation: {
				editor: { activePageId: "page-home", tourTopic: "api" },
				panel: { type: "openHelpEntry", entryId: "doc:docs/API.md" },
			},
		},
	],
};

describe("showcaseTourApi", () => {
	it("validates a well-formed non-linear tour config", () => {
		expect(validateShowcaseTourConfig(config)).toEqual([]);
	});

	it("reports duplicate and missing config references", () => {
		const invalid: ShowcaseTourConfig = {
			...config,
			entryStepId: "missing-entry",
			topics: [
				config.topics[0],
				{ ...config.topics[0], stepIds: ["url-state", "missing-step"] },
			],
		};

		expect(validateShowcaseTourConfig(invalid)).toEqual(
			expect.arrayContaining([
				{ kind: "duplicate-id", id: "start" },
				{ kind: "topic-step-mismatch", id: "url-state" },
				{ kind: "missing-step", id: "missing-step" },
				{ kind: "missing-step", id: "missing-entry" },
			]),
		);
	});

	it("resolves URL-derived topic and step fallbacks", () => {
		expect(resolveShowcaseTourLocation(config, null)).toEqual({
			topicId: "start",
			stepId: "welcome",
		});
		expect(resolveShowcaseTourLocation(config, { topicId: "api" })).toEqual({
			topicId: "api",
			stepId: "url-state",
		});
		expect(resolveShowcaseTourLocation(config, { stepId: "jump" })).toEqual({
			topicId: "start",
			stepId: "jump",
		});
		expect(
			resolveShowcaseTourLocation(config, {
				topicId: "start",
				stepId: "url-state",
			}),
		).toEqual({ topicId: "start", stepId: "welcome" });
	});

	it("supports ordered next/back navigation across topics", () => {
		expect(
			getAdjacentShowcaseTourStep(
				config,
				{ topicId: "start", stepId: "jump" },
				"next",
			),
		).toEqual({ topicId: "api", stepId: "url-state" });
		expect(
			getAdjacentShowcaseTourStep(
				config,
				{ topicId: "api", stepId: "url-state" },
				"previous",
			),
		).toEqual({ topicId: "start", stepId: "jump" });
		expect(
			getAdjacentShowcaseTourStep(
				config,
				{ topicId: "missing", stepId: "missing" },
				"next",
			),
		).toEqual({ topicId: "start", stepId: "welcome" });
	});

	it("returns topic steps and detects the final step", () => {
		expect(
			getShowcaseTourStepsForTopic(config, "start").map((step) => step.id),
		).toEqual(["welcome", "jump"]);
		expect(getShowcaseTourStep(config, "url-state")?.navigation.panel).toEqual({
			type: "openHelpEntry",
			entryId: "doc:docs/API.md",
		});
		expect(
			isLastShowcaseTourStep(config, {
				topicId: "api",
				stepId: "url-state",
			}),
		).toBe(true);
	});

	it("resolves panel requests as a complete step scene", () => {
		expect(getShowcaseTourPanelRequests({})).toEqual([{ type: "closeAll" }]);
		expect(
			getShowcaseTourPanelRequests({
				panel: { type: "open", panel: "components" },
			}),
		).toEqual([{ type: "closeAll" }, { type: "open", panel: "components" }]);
		expect(
			getShowcaseTourPanelRequests({
				panels: [
					{ type: "closeAll" },
					{ type: "openHelpEntry", entryId: "doc:docs/API.md" },
				],
				panel: { type: "open", panel: "components" },
			}),
		).toEqual([
			{ type: "closeAll" },
			{ type: "openHelpEntry", entryId: "doc:docs/API.md" },
		]);
	});
});
