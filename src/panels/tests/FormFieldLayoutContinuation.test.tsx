import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { InspectorActionHandlers, InspectorOrderState } from "../inspector/types";
import { createInitialDocument, createTextNode } from "../../model/defaults";
import { MultiSelectInspector } from "../MultiSelectInspector";
import { PageEditorContent } from "../PageEditorContent";
import { PagesExportSettingsContent } from "../PagesExportSettingsContent";
import { PagesSiteSettingsContent } from "../PagesSiteSettingsContent";
import { FormField } from "../controls/FormLayout";

const ORDER_STATE: InspectorOrderState = {
	showOrderControls: false,
	canOrderBack: false,
	canOrderForward: false,
	canSendToBack: false,
	canBringToFront: false,
	orderBackShortcut: "",
	orderForwardShortcut: "",
	sendToBackShortcut: "",
	bringToFrontShortcut: "",
	canSectionBack: false,
	canSectionForward: false,
	onOrderBack: () => {},
	onOrderForward: () => {},
	onSendToBack: () => {},
	onBringToFront: () => {},
	onSectionBack: () => {},
	onSectionForward: () => {},
};

const ACTIONS = {
	onTextChange: () => {},
	onWrapperStyleChange: () => {},
	onRectChange: () => {},
	onSetNodeVisibility: () => {},
	onSetTopLevelWrapperVisibility: () => {},
	onPromote: () => {},
	onDemote: () => {},
	onStickyEnabled: () => {},
	onStickyTarget: () => {},
	onStickyEdges: () => {},
	onStickyOffset: () => {},
	onStickyOffsetTop: () => {},
	onStickyOffsetBottom: () => {},
	onStickyDurationMode: () => {},
	onStickyDuration: () => {},
	onStickyDurationTop: () => {},
	onStickyDurationBottom: () => {},
	onStickyElevation: () => {},
	onStickyElevated: () => {},
	onSwitchTextSubtype: () => {},
	onAnimationPresetChange: () => {},
	onAnimationKeyframeChange: () => {},
	onAnimationOptionsChange: () => {},
	onAnimationClear: () => {},
	onAnimationDocSettingsChange: () => {},
	onEnterFocusedMode: () => {},
	onOpenManageFonts: () => {},
} as unknown as InspectorActionHandlers;

describe("panels/FormField layout continuation", () => {
	it("right-aligns inline-group control rails within fixed widths", () => {
		const markup = renderToStaticMarkup(
			<FormField label="Align" layout="inline-group" controlWidth="180px">
				<button type="button">One</button>
				<button type="button">Two</button>
			</FormField>,
		);

		expect(markup).toContain('data-layout="inline-group"');
		expect(markup).toContain('style="width:180px"');
		expect(markup).toContain("justify-end");
	});

	it("renders supporting description content below the field body", () => {
		const markup = renderToStaticMarkup(
			<FormField label="Align" description="Uses the first selected node as the anchor.">
				<button type="button">One</button>
			</FormField>,
		);

		expect(markup).toContain('data-ui="form-field-description"');
	});

	it("uses FormField layouts in page and site settings surfaces", () => {
		const document = createInitialDocument();
		const page = document.pages?.[0];

		if (!page) {
			throw new Error("Expected initial page");
		}

		const pageMarkup = renderToStaticMarkup(
			<PageEditorContent
				page={page}
				document={document}
				onSetDisplayName={() => {}}
				onSetHomePage={() => {}}
				onSetSlug={() => {}}
				onSetLang={() => {}}
				onAddAlias={() => {}}
				onRemoveAlias={() => {}}
				onSetVisibility={() => {}}
				onSetViewTransition={() => {}}
				onSetParent={() => {}}
				onSyncPageLinks={() => {}}
				onValidateLinks={() => {}}
			/>,
		);
		const siteMarkup = renderToStaticMarkup(
			<PagesSiteSettingsContent
				siteSettings={document.siteSettings}
				onSetSiteSettings={() => {}}
			/>,
		);
		const exportMarkup = renderToStaticMarkup(
			<PagesExportSettingsContent
				siteSettings={document.siteSettings}
				linkErrors={null}
				onSetSiteSettings={() => {}}
				onValidateLinks={() => []}
			/>,
		);

		expect((pageMarkup.match(/data-layout="inline"/g) ?? []).length).toBeGreaterThanOrEqual(3);
		expect((siteMarkup.match(/data-layout="inline"/g) ?? []).length).toBeGreaterThanOrEqual(3);
		expect(exportMarkup).toContain('data-layout="inline"');
	});

	it("uses FormField layouts in multiselect typography surfaces", () => {
		const document = createInitialDocument();
		const first = createTextNode("block", document.rootId);
		const second = createTextNode("block", document.rootId);

		const markup = renderToStaticMarkup(
			<MultiSelectInspector
				document={document}
				selectedNodes={[first, second]}
				orderState={ORDER_STATE}
				actions={ACTIONS}
				globalStickyElevation={false}
				onAlignSelection={() => {}}
				onDistributeSelection={() => {}}
				onBulkEdit={() => {}}
			/>,
		);

		expect((markup.match(/data-layout="inline-group"/g) ?? []).length).toBeGreaterThanOrEqual(4);
		expect(markup).toContain('data-layout="inline"');
	});
});
