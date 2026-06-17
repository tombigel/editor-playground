import { describe, expect, it } from "vitest";
import { createInitialState } from "@/api/editorApi";
import { createShowcaseTourReturnState } from "../useShowcaseTourController";

describe("useShowcaseTourController", () => {
	it("preserves the pre-tour editor flags and cleans tour URL params for URL-launched tours", () => {
		const state = createInitialState();
		const returnState = createShowcaseTourReturnState(
			{
				...state,
				ui: {
					...state.ui,
					previewSticky: false,
					showDebugInfo: false,
					spacerVisibility: "selected",
					animationPreview: { ...state.ui.animationPreview, enabled: false },
				},
			},
			"?tour=api&step=debug-info&debug=1&spacers=all&keep=1",
			"clean",
		);

		expect(returnState.search).toBe("?keep=1");
		expect(returnState.navigation).toMatchObject({
			previewSticky: false,
			showDebugInfo: false,
			spacerVisibility: "selected",
			animationPreviewEnabled: false,
		});
	});

	it("preserves the existing search when the tour is opened from the editor", () => {
		const state = createInitialState();
		const returnState = createShowcaseTourReturnState(
			state,
			"?debug=1&keep=1",
			"preserve",
		);

		expect(returnState.search).toBe("?debug=1&keep=1");
	});
});
