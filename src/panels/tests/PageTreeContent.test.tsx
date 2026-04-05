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
	it("renders page rows with settings, delete, and row-surface drag behavior", () => {
		const document = createDocumentWithNestedPages();

		const markup = renderToStaticMarkup(
			<PageTreeContent
				document={document}
				activePageId="page-home"
				onSetActivePage={NO_OP}
				onAddPage={NO_OP}
				onDeletePage={NO_OP}
				onOpenSettings={NO_OP}
				onSetPageParent={NO_OP}
				onReorderPage={NO_OP}
				onSetPageVisibility={NO_OP}
			/>,
		);

		expect(markup).toContain("Home");
		expect(markup).toContain("About");
		expect(markup).toContain('data-page-row-id="page-home"');
		expect(markup).toContain('aria-label="Page settings for Home"');
		expect(markup).toContain('aria-label="Delete Home"');
	});

	it("does not render children of collapsed parents by default", () => {
		const document = createDocumentWithNestedPages();

		const markup = renderToStaticMarkup(
			<PageTreeContent
				document={document}
				activePageId="page-home"
				onSetActivePage={NO_OP}
				onAddPage={NO_OP}
				onDeletePage={NO_OP}
				onOpenSettings={NO_OP}
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
				onDeletePage={NO_OP}
				onOpenSettings={NO_OP}
				onSetPageParent={NO_OP}
				onReorderPage={NO_OP}
				onSetPageVisibility={NO_OP}
			/>,
		);

		expect(markup).toContain("No pages yet.");
	});
});
