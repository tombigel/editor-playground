import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInitialDocument } from "../../model/defaults";
import { PageTreeContent } from "../PageTreeContent";
import { buildPageTreeRows } from "../pageTree";

function createDocumentWithNestedPages() {
	const document = createInitialDocument();
	document.pages = [
		{
			type: "page",
			id: "page-home",
			displayName: "Home",
			slug: "home",
			pageRole: "home",
			sectionIds: [],
			visible: true,
		},
		{
			type: "page",
			id: "page-about",
			displayName: "About",
			slug: "about",
			sectionIds: [],
			visible: true,
		},
		{
			type: "page",
			id: "page-team",
			displayName: "Team",
			slug: "team",
			sectionIds: [],
			parentPageId: "page-about",
			visible: true,
		},
	];
	return document;
}

const NO_OP = () => undefined;

describe("panels/PageTreeContent", () => {
	it("renders page rows with delete and row-surface drag behavior", () => {
		const document = createDocumentWithNestedPages();

		const markup = renderToStaticMarkup(
			<PageTreeContent
				document={document}
				activePageId="page-home"
				onSetActivePage={NO_OP}
				onAddPage={NO_OP}
				onDuplicatePage={NO_OP}
				onDeletePage={NO_OP}
				onSetPageParent={NO_OP}
				onReorderPage={NO_OP}
				onSetPageVisibility={NO_OP}
			/>,
		);

		expect(markup).toContain("Home");
		expect(markup).toContain("About");
		expect(markup).toContain('data-page-row-id="page-home"');
		expect(markup).toContain('data-ui="tree-row-label-content"');
		expect(markup).toContain('aria-label="Delete About"');
		expect(markup).toContain('aria-label="Duplicate About"');
		expect(markup).toContain("editor-pill-subtle");
		expect(markup).toContain('class="editor-border-subtle border-t px-3 py-3"');
		expect(markup).toContain('data-variant="default"');
		expect(markup).toContain("Add page");
	});

	it("does not render children of collapsed parents by default", () => {
		const document = createDocumentWithNestedPages();

		const markup = renderToStaticMarkup(
			<PageTreeContent
				document={document}
				activePageId="page-home"
				onSetActivePage={NO_OP}
				onAddPage={NO_OP}
				onDuplicatePage={NO_OP}
				onDeletePage={NO_OP}
				onSetPageParent={NO_OP}
				onReorderPage={NO_OP}
				onSetPageVisibility={NO_OP}
			/>,
		);

		expect(markup).toContain("Expand About");
		expect(markup).not.toContain("Team");
	});

	it("builds indented child rows when the parent is expanded", () => {
		const document = createDocumentWithNestedPages();
		const rows = buildPageTreeRows(
			document.pages ?? [],
			"page-home",
			new Set(["page-about"]),
		);
		const childRow = rows.find((row) => row.page.id === "page-team");

		expect(childRow).toBeTruthy();
		expect(childRow?.depth).toBe(1);
	});

	it("renders an empty state when there are no pages", () => {
		const document = createInitialDocument();
		document.pages = [];

		const markup = renderToStaticMarkup(
			<PageTreeContent
				document={document}
				activePageId={null}
				onSetActivePage={NO_OP}
				onAddPage={NO_OP}
				onDuplicatePage={NO_OP}
				onDeletePage={NO_OP}
				onSetPageParent={NO_OP}
				onReorderPage={NO_OP}
				onSetPageVisibility={NO_OP}
			/>,
		);

		expect(markup).toContain("No pages yet.");
		expect(markup).toContain('data-ui="notice-surface"');
	});

	it("disables delete for the only page", () => {
		const document = createInitialDocument();

		const markup = renderToStaticMarkup(
			<PageTreeContent
				document={document}
				activePageId={document.pages?.[0]?.id ?? null}
				onSetActivePage={NO_OP}
				onAddPage={NO_OP}
				onDuplicatePage={NO_OP}
				onDeletePage={NO_OP}
				onSetPageParent={NO_OP}
				onReorderPage={NO_OP}
				onSetPageVisibility={NO_OP}
			/>,
		);

		expect(markup).not.toContain('aria-label="Delete Home"');
	});

	it("omits home page visibility and delete actions in the tree", () => {
		const document = createDocumentWithNestedPages();

		const markup = renderToStaticMarkup(
			<PageTreeContent
				document={document}
				activePageId="page-home"
				onSetActivePage={NO_OP}
				onAddPage={NO_OP}
				onDuplicatePage={NO_OP}
				onDeletePage={NO_OP}
				onSetPageParent={NO_OP}
				onReorderPage={NO_OP}
				onSetPageVisibility={NO_OP}
			/>,
		);

		expect(markup).not.toContain('aria-label="Hide page-home"');
		expect(markup).not.toContain('aria-label="Delete Home"');
	});
});
