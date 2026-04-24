import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	createButtonTextNode,
	createInitialDocument,
	createTextNode,
} from "../../../model/defaults";
import { ButtonDesignSection } from "../contentSections/buttonSections";
import {
	CodeDesignSection,
	CodeTextStyleSection,
} from "../contentSections/textSections";
import {
	NavigationFields,
	OpenInNewTabField,
} from "../contentSections/shared";

describe("panels/inspector/content section rows", () => {
	it("uses FormField for simple button and code design rows", () => {
		const buttonNode = createButtonTextNode("root");
		const codeNode = createTextNode("code", "root");

		const buttonMarkup = renderToStaticMarkup(
			<ButtonDesignSection node={buttonNode} onTextChange={() => {}} />,
		);
		const codeMarkup = renderToStaticMarkup(
			<CodeDesignSection node={codeNode} onTextChange={() => {}} />,
		);

		expect((buttonMarkup.match(/data-layout="inline"/g) ?? []).length).toBeGreaterThanOrEqual(2);
		expect(buttonMarkup).toContain(">Border<");
		expect(codeMarkup).toContain('data-layout="inline"');
		expect(codeMarkup).toContain(">Border<");
	});

	it("renders code theme, tab width, and reset controls", () => {
		const codeNode = createTextNode("code", "root");
		const markup = renderToStaticMarkup(
			<CodeTextStyleSection
				node={codeNode}
				onTextChange={() => {}}
				onResetCodeBlockStyle={() => {}}
			/>,
		);

		expect(markup).toContain(">auto<");
		expect(markup).toContain(">light<");
		expect(markup).toContain(">dark<");
		expect(markup).toContain(">Tab<");
		expect(markup).toContain('type="number"');
		expect(markup).toContain("Reset code styling");
	});

	it("uses FormField for shared navigation fields and open-in-new-tab rows", () => {
		const document = createInitialDocument();
		const page = document.pages?.[0];
		const node = createButtonTextNode(document.rootId);
		const anchorNode = createButtonTextNode(document.rootId);

		if (!page?.sectionIds[0]) {
			throw new Error("Expected initial document page with a section");
		}

		node.link = {
			linkType: "page",
			targetPageId: page.id,
			pageAnchorId: page.sectionIds[0],
			href: `/${page.slug}`,
		};
		anchorNode.link = {
			linkType: "anchor",
			anchorTargetId: page.sectionIds[0],
			href: `#${page.sectionIds[0]}`,
		};

		const navigationMarkup = renderToStaticMarkup(
			<NavigationFields
				document={document}
				node={node}
				onTextChange={() => {}}
			/>,
		);
		const anchorMarkup = renderToStaticMarkup(
			<NavigationFields
				document={document}
				node={anchorNode}
				onTextChange={() => {}}
			/>,
		);
		const openInNewTabMarkup = renderToStaticMarkup(
			<OpenInNewTabField checked={false} onChange={() => {}} />,
		);

		expect(navigationMarkup).toContain("Page");
		expect(navigationMarkup).toContain("Jump to section (optional)");
		expect((navigationMarkup.match(/data-layout="stack"/g) ?? []).length).toBeGreaterThanOrEqual(2);
		expect(anchorMarkup).toContain(">Section<");
		expect((anchorMarkup.match(/data-layout="stack"/g) ?? []).length).toBeGreaterThanOrEqual(1);
		expect(openInNewTabMarkup).toContain('data-layout="inline"');
		expect(openInNewTabMarkup).toContain('aria-label="Open in a new tab"');
	});
});
