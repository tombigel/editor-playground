import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	createButtonTextNode,
	createInitialDocument,
	createMediaNode,
	createTextNode,
} from "../../../model/defaults";
import { ButtonDesignSection } from "../contentSections/buttonSections";
import {
	SvgContentSection,
	readNextSvgViewBoxValue,
} from "../contentSections/svgSections";
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

	it("renders code theme, tab width, wrap, and mono font controls", () => {
		const document = createInitialDocument();
		const codeNode = createTextNode("code", "root");
		const markup = renderToStaticMarkup(
			<CodeTextStyleSection
				document={document}
				node={codeNode}
				onTextChange={() => {}}
				onOpenManageFonts={() => {}}
			/>,
		);

		expect(markup).toContain("System Mono");
		expect(markup).toContain('aria-label="More monospace fonts"');
		expect(markup).toContain(">auto<");
		expect(markup).toContain(">light<");
		expect(markup).toContain(">dark<");
		expect(markup).toContain(">Tab<");
		expect(markup).toContain('style="width:2.5em"');
		expect(markup).toContain('type="number"');
		expect(markup).toContain(">Wrap<");
		expect(markup).toContain('aria-label="Wrapped code"');
		expect(markup).not.toContain("Reset code styling");
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

	it("renders SVG markup as mono text and splits viewBox controls", () => {
		const svgNode = createMediaNode("svg", "root");
		if (svgNode.subtype !== "svg") {
			throw new Error("Expected SVG media node");
		}
		if (!svgNode.svg) {
			throw new Error("Expected SVG extension");
		}
		svgNode.svg.viewBox = "1 2 30 40";

		const markup = renderToStaticMarkup(
			<SvgContentSection
				node={svgNode}
				onTextChange={() => {}}
				onSetSvgMarkup={() => {}}
			/>,
		);

		expect(markup).toContain("font-mono");
		expect(markup).toContain('aria-label="SVG viewBox Min X"');
		expect(markup).toContain('aria-label="SVG viewBox Min Y"');
		expect(markup).toContain('aria-label="SVG viewBox Width"');
		expect(markup).toContain('aria-label="SVG viewBox Height"');
		expect(markup).toContain('value="1"');
		expect(markup).toContain('value="2"');
		expect(markup).toContain('value="30"');
		expect(markup).toContain('value="40"');
		expect(markup).toContain("lucide-check");
		expect(markup).toContain("lucide-maximize-2");
		expect(markup).toContain("lucide-rotate-ccw");
	});

	it("composes SVG viewBox edits and accepts pasted viewBox strings", () => {
		expect(readNextSvgViewBoxValue("0 0 24 24", "width", "32")).toBe("0 0 32 24");
		expect(readNextSvgViewBoxValue("0 0 24 24", "minX", "1 2 30 40")).toBe("1 2 30 40");
		expect(readNextSvgViewBoxValue("", "width", "32")).toBeNull();
	});
});
