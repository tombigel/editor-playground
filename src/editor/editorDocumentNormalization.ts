import { normalizeDocumentFontState } from "../fonts";
import { forceOpaqueColorValue } from "../model/colors";
import {
	createDefaultFooter,
	createDefaultHeader,
	createDefaultRect,
	createLinkTextNode,
	createSectionFromTemplate,
	createTextNode,
	syncIdCountersWithDocument,
} from "../model/defaults";
import { getLinkHref } from "../model/links";
import {
	createTextDocumentFromCode,
	createTextDocumentFromText,
	getTextContent,
	stripDerivedCodeHighlightsFromTextNode,
} from "../model/richContent";
import type {
	ContainerNode,
	ContainerSubtype,
	DocumentModel,
	DocumentNode,
	NodeId,
	RichTextBlockType,
	StickyDefinition,
	TextNode,
} from "../model/types";
import {
	isContainerNode,
	isMediaNode,
	isSiteNode,
	isTextNode,
} from "../model/types";
import {
	parseFontSizeValue,
	parseSpacingValue,
	parseUnitValue,
} from "../model/units";
import { highlightCode } from "../render/codeHighlight";

export function cloneDocument(document: DocumentModel): DocumentModel {
	return {
		rootId: document.rootId,
		nodes: structuredClone(document.nodes),
		fontLibrary: structuredClone(document.fontLibrary),
		...(document.animationSettings
			? { animationSettings: structuredClone(document.animationSettings) }
			: {}),
		...(document.pages ? { pages: structuredClone(document.pages) } : {}),
		...(document.siteSettings
			? { siteSettings: structuredClone(document.siteSettings) }
			: {}),
		...(document.sharedRegionIds
			? { sharedRegionIds: [...document.sharedRegionIds] }
			: {}),
	};
}

function normalizeSticky(
	sticky: StickyDefinition | undefined,
): StickyDefinition | undefined {
	if (!sticky) {
		return undefined;
	}

	const bottom = sticky.edges?.bottom ?? false;
	let top = sticky.edges?.top ?? !bottom;
	let normalizedBottom = bottom;

	// Heuristic migration: keep single-edge intent when legacy data accidentally persisted both edges.
	if (top && normalizedBottom) {
		if (!sticky.offsetTop && sticky.offsetBottom) {
			top = false;
		} else if (sticky.offsetTop && !sticky.offsetBottom) {
			normalizedBottom = false;
		}
	}

	const duration = sticky.duration ?? parseUnitValue("50vh");
	const durationTop = sticky.durationTop ?? duration;
	const durationBottom = sticky.durationBottom ?? duration;

	return {
		...sticky,
		enabled: sticky.enabled ?? false,
		target: sticky.target ?? "self",
		durationMode: sticky.durationMode ?? "auto",
		duration,
		durationTop,
		durationBottom,
		edges: { top, bottom: normalizedBottom },
	};
}

export function normalizeDocument(document: DocumentModel): DocumentModel {
	const normalized = normalizeDocumentFontState(cloneDocument(document));
	syncIdCountersWithDocument(normalized);
	for (const node of Object.values(normalized.nodes)) {
		if (isSiteNode(node)) {
			continue;
		}
		if (isTextNode(node)) {
			node.htmlTag = normalizeTextHtmlTag(node.htmlTag);
			stripDerivedCodeHighlightsFromTextNode(node);
		}
		node.sticky = normalizeSticky(node.sticky);
		if (
			isContainerNode(node) &&
			node.subtype === "container" &&
			node.sticky?.target === "contentWrapper"
		) {
			node.sticky.target = "self";
		}
		if (
			isContainerNode(node) &&
			isStructuralWrapper(node.subtype) &&
			node.style?.background
		) {
			node.style.background = forceOpaqueColorValue(node.style.background);
		}
	}
	ensureDefaultSiteSections(normalized);
	upgradeLegacyStarterSection(normalized);
	upgradeLegacyStarterShell(normalized);
	normalizeStarterShellTextTags(normalized);
	renameRepositoryLinks(normalized);
	return normalized;
}

export function normalizeTextHtmlTag(
	htmlTag: TextNode["htmlTag"] | undefined,
): TextNode["htmlTag"] {
	switch (htmlTag) {
		case "h1":
		case "h2":
		case "h3":
		case "h4":
		case "h5":
		case "h6":
		case "p":
		case "blockquote":
			return htmlTag;
		default:
			return "p";
	}
}

export function isStructuralWrapper(subtype: ContainerSubtype) {
	return subtype === "section" || subtype === "header" || subtype === "footer";
}

function htmlTagToBlockType(htmlTag: TextNode["htmlTag"]): RichTextBlockType {
	if (htmlTag === "blockquote") {
		return "blockquote";
	}
	if (htmlTag && htmlTag !== "p") {
		return htmlTag;
	}
	return "paragraph";
}

function getNodePlainText(node: TextNode): string {
	return getTextContent(node.content.blocks, { blockSeparator: "\n" });
}

function setNodePlainText(node: TextNode, text: string) {
	if (node.subtype === "code") {
		node.content = createTextDocumentFromCode(text, {
			language: node.code?.language,
			theme: node.code?.theme,
			highlightedHtml: node.code?.language
				? highlightCode(text, node.code.language)
				: undefined,
		});
		return;
	}

	node.content = createTextDocumentFromText(text, {
		type: htmlTagToBlockType(node.htmlTag),
	});
}

function createUniqueTextNode(document: DocumentModel, parentId: NodeId) {
	let node = createTextNode("block", parentId);
	while (document.nodes[node.id]) {
		node = createTextNode("block", parentId);
	}
	return node;
}

function createUniqueLinkTextNode(document: DocumentModel, parentId: NodeId) {
	let node = createLinkTextNode(parentId);
	while (document.nodes[node.id]) {
		node = createLinkTextNode(parentId);
	}
	return node;
}

function renameRepositoryLinks(document: DocumentModel) {
	for (const node of Object.values(document.nodes)) {
		if (!isTextNode(node) || !node.link) {
			continue;
		}

		if (getNodePlainText(node) === "github.com/tombigel/codex-playground") {
			setNodePlainText(node, "github.com/tombigel/sticky-playground");
		}

		if (
			node.link &&
			getLinkHref(node.link) === "https://github.com/tombigel/codex-playground"
		) {
			node.link.href = "https://github.com/tombigel/sticky-playground";
		}
	}
}

function upgradeLegacyStarterShell(document: DocumentModel) {
	const root = document.nodes[document.rootId];
	if (!root || !isSiteNode(root)) {
		return;
	}

	const wrappers = root.children
		.map((id) => document.nodes[id])
		.filter((node): node is ContainerNode =>
			Boolean(node && isContainerNode(node)),
		);

	const header = wrappers.find((node) => node.subtype === "header");
	const footer = wrappers.find((node) => node.subtype === "footer");

	if (header && isLegacyHeader(document, header)) {
		applyModernHeader(document, header);
	}

	if (footer && isLegacyFooter(document, footer)) {
		applyModernFooter(document, footer);
	}
}

function normalizeStarterShellTextTags(document: DocumentModel) {
	for (const node of Object.values(document.nodes)) {
		if (!isTextNode(node)) {
			continue;
		}

		if (
			node.name === "Product Title" &&
			getNodePlainText(node) === "Sticky Playground"
		) {
			node.htmlTag = "h1";
		}

		if (
			node.name === "Footer Title" &&
			getNodePlainText(node) === "Sticky Playground"
		) {
			node.htmlTag = "h2";
		}
	}
}

function upgradeLegacyStarterSection(document: DocumentModel) {
	const root = document.nodes[document.rootId];
	if (!root || !isSiteNode(root)) {
		return;
	}

	const sections = root.children
		.map((id) => document.nodes[id])
		.filter((node): node is ContainerNode =>
			Boolean(node && isContainerNode(node) && node.subtype === "section"),
		);

	if (sections.length !== 1) {
		return;
	}

	const [legacySection] = sections;
	if (!legacySection || !isLegacyStarterSection(document, legacySection)) {
		return;
	}

	const sectionIndex = root.children.indexOf(legacySection.id);
	removeNodeSubtree(document, legacySection.id);

	const { wrapper, nodes } = createSectionFromTemplate("post", document.rootId);
	Object.assign(document.nodes, nodes);
	root.children.splice(sectionIndex, 1, wrapper.id);
}

function isLegacyStarterSection(
	document: DocumentModel,
	section: ContainerNode,
) {
	if (
		section.name !== "Section" ||
		section.rect.width.base.raw !== "100%" ||
		section.rect.height.base.raw !== "480px" ||
		section.children.length !== 2
	) {
		return false;
	}

	const [firstChildId, secondChildId] = section.children;
	const firstChild = document.nodes[firstChildId];
	const secondChild = document.nodes[secondChildId];

	return isLegacyStarterText(firstChild) && isLegacyStarterButton(secondChild);
}

function isLegacyStarterText(node: DocumentNode | undefined): node is TextNode {
	return Boolean(
		node &&
			isTextNode(node) &&
			!node.link &&
			node.name === "Text" &&
			getNodePlainText(node) === "Edit text" &&
			node.rect.x.base.raw === "32px" &&
			node.rect.y.base.raw === "32px" &&
			node.rect.width.base.raw === "fit-content" &&
			node.rect.height.base.raw === "auto",
	);
}

function isLegacyStarterButton(
	node: DocumentNode | undefined,
): node is TextNode {
	return Boolean(
		node &&
			isTextNode(node) &&
			node.link &&
			node.style?.background &&
			node.name === "Button" &&
			getNodePlainText(node) === "Button" &&
			node.rect.x.base.raw === "32px" &&
			node.rect.y.base.raw === "32px" &&
			node.rect.width.base.raw === "fit-content" &&
			node.rect.height.base.raw === "auto",
	);
}

function isLegacyHeader(document: DocumentModel, header: ContainerNode) {
	if (header.name === "Primary Header") {
		return true;
	}

	const children = header.children
		.map((id) => document.nodes[id])
		.filter(Boolean);
	const brandName = children.find(
		(node): node is TextNode =>
			isTextNode(node) &&
			!node.link &&
			getNodePlainText(node) === "Business Name",
	);
	const homeLink = children.find(
		(node) =>
			isTextNode(node) && node.link && getNodePlainText(node) === "Home",
	);
	if (brandName && homeLink) {
		return true;
	}

	const hasLegacyModernMark = children.some(
		(node) => isMediaNode(node) && node.name === "Brand Mark",
	);
	const hasStarterTitle = children.some(
		(node) =>
			isTextNode(node) &&
			!node.link &&
			node.name === "Product Title" &&
			getNodePlainText(node) === "Sticky Playground",
	);
	if (hasLegacyModernMark && hasStarterTitle) {
		return true;
	}

	const textOnlyStarterTitle = children.find(
		(node): node is TextNode =>
			isTextNode(node) &&
			!node.link &&
			node.name === "Product Title" &&
			getNodePlainText(node) === "Sticky Playground",
	);
	const titleX = textOnlyStarterTitle
		? parseFloat(textOnlyStarterTitle.rect.x.base.raw) || 0
		: 0;
	return Boolean(textOnlyStarterTitle && titleX < 40);
}

function isLegacyFooter(document: DocumentModel, footer: ContainerNode) {
	if (footer.name === "Footer") {
		return true;
	}

	const children = footer.children
		.map((id) => document.nodes[id])
		.filter(Boolean);
	const hasOldBusinessCopy = children.some(
		(node) =>
			isTextNode(node) &&
			!node.link &&
			getNodePlainText(node).includes("Built for sticky exploration"),
	);
	if (hasOldBusinessCopy) {
		return true;
	}

	const modernCopy = children.find(
		(node): node is TextNode =>
			isTextNode(node) &&
			!node.link &&
			node.name === "Footer Copy" &&
			getNodePlainText(node) ===
				"A prototyping surface for sticky logic, spacing strategy, and interaction QA.",
	);
	const hasModernMeta = children.some(
		(node) => isTextNode(node) && !node.link && node.name === "Footer Meta",
	);
	if (hasModernMeta) {
		return true;
	}

	const copyY = modernCopy ? parseFloat(modernCopy.rect.y.base.raw) || 0 : 0;
	return Boolean(modernCopy && copyY < 45);
}

function applyModernHeader(document: DocumentModel, header: ContainerNode) {
	const previousChildren = [...header.children];
	for (const childId of previousChildren) {
		removeNodeSubtree(document, childId);
	}

	header.name = "Playground Header";
	header.rect = createDefaultRect("0px", "0px", "100%", "auto");
	header.style ??= {};
	header.style.background = "#f8fbff";
	header.style.borderColor = "#d6e2f2";
	header.style.paddingTop = parseSpacingValue("20px");
	header.style.paddingRight = parseSpacingValue("48px");
	header.style.paddingBottom = parseSpacingValue("20px");
	header.style.paddingLeft = parseSpacingValue("48px");

	const title = createUniqueTextNode(document, header.id);
	title.name = "Product Title";
	setNodePlainText(title, "Sticky Playground");
	title.rect = createDefaultRect("62px", "25.5px", "max-content", "auto");
	title.style ??= {};
	title.style.color = "#0f172a";
	title.style.fontSize = parseFontSizeValue("20px");
	title.style.fontWeight = 700;
	title.htmlTag = "h1";

	const subtitle = createUniqueTextNode(document, header.id);
	subtitle.name = "Product Subtitle";
	setNodePlainText(
		subtitle,
		"Model, preview, and validate sticky behavior before implementation.",
	);
	subtitle.rect = createDefaultRect("61px", "60px", "max-content", "auto");
	subtitle.style ??= {};
	subtitle.style.color = "#516174";
	subtitle.style.fontSize = parseFontSizeValue("14px");

	const templatesLink = createUniqueLinkTextNode(document, header.id);
	templatesLink.name = "Templates Link";
	setNodePlainText(templatesLink, "Templates");
	templatesLink.rect = createDefaultRect(
		"836px",
		"48px",
		"max-content",
		"auto",
	);

	const stickyLink = createUniqueLinkTextNode(document, header.id);
	stickyLink.name = "Sticky Demos Link";
	setNodePlainText(stickyLink, "Sticky Demos");
	stickyLink.rect = createDefaultRect("947px", "48px", "max-content", "auto");

	const testPlanLink = createUniqueLinkTextNode(document, header.id);
	testPlanLink.name = "Test Plan Link";
	setNodePlainText(testPlanLink, "Test Plan");
	testPlanLink.rect = createDefaultRect("1082px", "48px", "144px", "24px");

	document.nodes[title.id] = title;
	document.nodes[subtitle.id] = subtitle;
	document.nodes[templatesLink.id] = templatesLink;
	document.nodes[stickyLink.id] = stickyLink;
	document.nodes[testPlanLink.id] = testPlanLink;
	header.children = [
		title.id,
		subtitle.id,
		templatesLink.id,
		stickyLink.id,
		testPlanLink.id,
	];
}

function applyModernFooter(document: DocumentModel, footer: ContainerNode) {
	const previousChildren = [...footer.children];
	for (const childId of previousChildren) {
		removeNodeSubtree(document, childId);
	}

	footer.name = "Playground Footer";
	footer.rect = createDefaultRect("0px", "0px", "100%", "auto");
	footer.style ??= {};
	footer.style.background = "#f8fbff";
	footer.style.borderColor = "#d6e2f2";
	footer.style.paddingTop = parseSpacingValue("26px");
	footer.style.paddingRight = parseSpacingValue("48px");
	footer.style.paddingBottom = parseSpacingValue("26px");
	footer.style.paddingLeft = parseSpacingValue("48px");

	const title = createUniqueTextNode(document, footer.id);
	title.name = "Footer Title";
	setNodePlainText(title, "Sticky Playground");
	title.rect = createDefaultRect("67px", "28px", "max-content", "auto");
	title.style ??= {};
	title.style.color = "#0f172a";
	title.style.fontSize = parseFontSizeValue("16px");
	title.style.fontWeight = 700;
	title.style.lineHeight = 1.2;
	title.htmlTag = "h2";

	const copy = createUniqueTextNode(document, footer.id);
	copy.name = "Footer Copy";
	setNodePlainText(
		copy,
		"A prototyping surface for sticky logic, spacing strategy, and interaction QA.",
	);
	copy.rect = createDefaultRect("64px", "53px", "271px", "38px");
	copy.style ??= {};
	copy.style.color = "#475569";
	copy.style.fontSize = parseFontSizeValue("14px");
	copy.style.lineHeight = 1.3;

	const repoLink = createUniqueLinkTextNode(document, footer.id);
	repoLink.name = "Repository Link";
	setNodePlainText(repoLink, "github.com/tombigel/sticky-playground");
	repoLink.link = {
		linkType: "external",
		href: "https://github.com/tombigel/sticky-playground",
		openInNewTab: true,
	};
	repoLink.rect = createDefaultRect("866px", "48px", "322px", "24px");

	document.nodes[title.id] = title;
	document.nodes[copy.id] = copy;
	document.nodes[repoLink.id] = repoLink;
	footer.children = [title.id, copy.id, repoLink.id];
}

function removeNodeSubtree(document: DocumentModel, nodeId: NodeId) {
	const node = document.nodes[nodeId];
	if (!node) {
		return;
	}
	for (const childId of node.children) {
		removeNodeSubtree(document, childId);
	}
	delete document.nodes[nodeId];
}

function ensureDefaultSiteSections(document: DocumentModel) {
	const root = document.nodes[document.rootId];
	if (!root || !isSiteNode(root)) {
		return;
	}

	const wrappers = root.children
		.map((id) => document.nodes[id])
		.filter((node): node is ContainerNode =>
			Boolean(node && isContainerNode(node)),
		);

	const hasHeader = wrappers.some((node) => node.subtype === "header");
	const hasFooter = wrappers.some((node) => node.subtype === "footer");

	if (!hasHeader) {
		const { wrapper, nodes } = createDefaultHeader(document.rootId);
		Object.assign(document.nodes, nodes);
		root.children.unshift(wrapper.id);
	}

	if (!hasFooter) {
		const { wrapper, nodes } = createDefaultFooter(document.rootId);
		Object.assign(document.nodes, nodes);
		root.children.push(wrapper.id);
	}
}
