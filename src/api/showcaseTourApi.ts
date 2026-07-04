/**
 * @module showcaseTourApi
 *
 * Read-only helpers for non-linear showcase tours.
 */

import type {
	EditorNavigationUrlState,
	EditorNodeTarget,
	EditorPanelRequest,
} from "./editorNavigationApi";
import type { SectionTemplateId } from "../model/types";

export type ShowcaseTourAnchor =
	| { type: "none" }
	| { type: "selector"; selector: string; label?: string }
	| { type: "tourMenu" };

export type ShowcaseTourStepNavigation = {
	editor?: EditorNavigationUrlState;
	nodeTarget?: EditorNodeTarget;
	panels?: EditorPanelRequest[];
	panel?: EditorPanelRequest;
	insertSectionTemplate?: {
		templateId: SectionTemplateId;
		ifMissingNodeName?: string;
	};
};

export type ShowcaseTourStepAction =
	| { type: "externalLink"; label: string; href: string }
	| { type: "instruction"; label: string };

export type ShowcaseTourStep = {
	id: string;
	topicId: string;
	title: string;
	body: string;
	route?: string[];
	anchor: ShowcaseTourAnchor;
	navigation: ShowcaseTourStepNavigation;
	action?: ShowcaseTourStepAction;
};

export type ShowcaseTourTopic = {
	id: string;
	label: string;
	description: string;
	stepIds: string[];
};

export type ShowcaseTourConfig = {
	entryTopicId: string;
	entryStepId: string;
	topics: ShowcaseTourTopic[];
	steps: ShowcaseTourStep[];
};

export type ShowcaseTourLocation = {
	topicId: string;
	stepId: string;
};

export type ShowcaseTourValidationIssue = {
	kind:
		| "missing-topic"
		| "missing-step"
		| "topic-step-mismatch"
		| "duplicate-id";
	id: string;
};

export function validateShowcaseTourConfig(
	config: ShowcaseTourConfig,
): ShowcaseTourValidationIssue[] {
	const issues: ShowcaseTourValidationIssue[] = [];
	const topicIds = new Set<string>();
	const stepIds = new Set<string>();

	for (const topic of config.topics) {
		if (topicIds.has(topic.id)) {
			issues.push({ kind: "duplicate-id", id: topic.id });
		}
		topicIds.add(topic.id);
	}

	for (const step of config.steps) {
		if (stepIds.has(step.id)) {
			issues.push({ kind: "duplicate-id", id: step.id });
		}
		stepIds.add(step.id);
		if (!topicIds.has(step.topicId)) {
			issues.push({ kind: "missing-topic", id: step.topicId });
		}
	}

	for (const topic of config.topics) {
		for (const stepId of topic.stepIds) {
			const step = config.steps.find((candidate) => candidate.id === stepId);
			if (!step) {
				issues.push({ kind: "missing-step", id: stepId });
			} else if (step.topicId !== topic.id) {
				issues.push({ kind: "topic-step-mismatch", id: stepId });
			}
		}
	}

	if (!topicIds.has(config.entryTopicId)) {
		issues.push({ kind: "missing-topic", id: config.entryTopicId });
	}
	if (!stepIds.has(config.entryStepId)) {
		issues.push({ kind: "missing-step", id: config.entryStepId });
	}

	return issues;
}

export function getShowcaseTourPanelRequests(
	navigation: ShowcaseTourStepNavigation,
): EditorPanelRequest[] {
	if (navigation.panels) {
		return navigation.panels;
	}
	return navigation.panel
		? [{ type: "closeAll" }, navigation.panel]
		: [{ type: "closeAll" }];
}

export function resolveShowcaseTourLocation(
	config: ShowcaseTourConfig,
	location: Partial<ShowcaseTourLocation> | null | undefined,
): ShowcaseTourLocation {
	const topic = location?.topicId
		? getShowcaseTourTopic(config, location.topicId)
		: null;
	const step = location?.stepId
		? getShowcaseTourStep(config, location.stepId)
		: null;

	if (topic && step && step.topicId === topic.id) {
		return { topicId: topic.id, stepId: step.id };
	}
	if (topic) {
		return {
			topicId: topic.id,
			stepId: topic.stepIds[0] ?? config.entryStepId,
		};
	}
	if (step) {
		return { topicId: step.topicId, stepId: step.id };
	}
	return { topicId: config.entryTopicId, stepId: config.entryStepId };
}

export function getShowcaseTourTopic(
	config: ShowcaseTourConfig,
	topicId: string,
) {
	return config.topics.find((topic) => topic.id === topicId) ?? null;
}

export function getShowcaseTourStep(
	config: ShowcaseTourConfig,
	stepId: string,
) {
	return config.steps.find((step) => step.id === stepId) ?? null;
}

export function getShowcaseTourStepsForTopic(
	config: ShowcaseTourConfig,
	topicId: string,
) {
	const topic = getShowcaseTourTopic(config, topicId);
	if (!topic) return [];
	return topic.stepIds.flatMap((stepId) => {
		const step = getShowcaseTourStep(config, stepId);
		return step ? [step] : [];
	});
}

export function getAdjacentShowcaseTourStep(
	config: ShowcaseTourConfig,
	location: ShowcaseTourLocation,
	direction: "next" | "previous",
): ShowcaseTourLocation {
	const orderedSteps = config.topics.flatMap((topic) =>
		getShowcaseTourStepsForTopic(config, topic.id),
	);
	const currentIndex = orderedSteps.findIndex(
		(step) => step.id === location.stepId,
	);
	if (currentIndex === -1) {
		return resolveShowcaseTourLocation(config, null);
	}
	const delta = direction === "next" ? 1 : -1;
	const nextIndex = Math.min(
		orderedSteps.length - 1,
		Math.max(0, currentIndex + delta),
	);
	const nextStep = orderedSteps[nextIndex];
	return { topicId: nextStep.topicId, stepId: nextStep.id };
}

export function isLastShowcaseTourStep(
	config: ShowcaseTourConfig,
	location: ShowcaseTourLocation,
) {
	const next = getAdjacentShowcaseTourStep(config, location, "next");
	return next.topicId === location.topicId && next.stepId === location.stepId;
}

export function getShowcaseTourProgress(
	config: ShowcaseTourConfig,
	location: ShowcaseTourLocation,
) {
	const allSteps = config.topics.flatMap((topic) =>
		getShowcaseTourStepsForTopic(config, topic.id),
	);
	const index = allSteps.findIndex((step) => step.id === location.stepId);
	const topicSteps = getShowcaseTourStepsForTopic(config, location.topicId);
	const topicIndex = topicSteps.findIndex(
		(step) => step.id === location.stepId,
	);
	return {
		index: Math.max(0, index),
		total: allSteps.length,
		topicIndex: Math.max(0, topicIndex),
		topicTotal: topicSteps.length,
	};
}
