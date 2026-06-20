import type { RichTextBlockType } from "../../../model/types";
import type { createRichEditor } from "../../../render/richTextEditor";
import type { RichToolbarOffset } from "../richToolbarPosition";

export type RichEditor = ReturnType<typeof createRichEditor>;

export type LinkPopoverDraft = {
	open: boolean;
	linkType: "external" | "page" | "anchor";
	href: string;
	targetPageId: string;
	pageAnchorId: string;
	anchorTargetId: string;
};

export const DEFAULT_LINK_POPOVER: LinkPopoverDraft = {
	open: false,
	linkType: "external",
	href: "",
	targetPageId: "",
	pageAnchorId: "",
	anchorTargetId: "",
};

export type ToolbarDragState = {
	pointerId: number;
	originX: number;
	originY: number;
	originOffset: RichToolbarOffset;
	rootRect: DOMRect;
	panelWidth: number;
	panelHeight: number;
};

export const RICH_SELECT_IDS = {
	blockType: "block-type",
	orderedListMarker: "ordered-list-marker",
	unorderedListMarker: "unordered-list-marker",
	codeLanguage: "code-language",
	sectionTarget: "section-target",
	targetPage: "target-page",
	targetPageSection: "target-page-section",
} as const;

export type RichEditSelectId =
	(typeof RICH_SELECT_IDS)[keyof typeof RICH_SELECT_IDS];

export const RICH_VALUE_FIELD_IDS = {
	fontSize: "font-size",
} as const;

export type RichEditValueFieldId =
	(typeof RICH_VALUE_FIELD_IDS)[keyof typeof RICH_VALUE_FIELD_IDS];

export const BLOCK_TYPE_OPTIONS: Array<{
	value: RichTextBlockType;
	label: string;
}> = [
	{ value: "h1", label: "H1" },
	{ value: "h2", label: "H2" },
	{ value: "h3", label: "H3" },
	{ value: "h4", label: "H4" },
	{ value: "h5", label: "H5" },
	{ value: "h6", label: "H6" },
	{ value: "paragraph", label: "P" },
	{ value: "blockquote", label: "Blockquote" },
	{ value: "div", label: "Div" },
];

export const ORDERED_MARKER_OPTIONS = [
	{ value: "decimal", label: "1." },
	{ value: "lower-alpha", label: "a." },
	{ value: "upper-alpha", label: "A." },
	{ value: "lower-roman", label: "i." },
	{ value: "upper-roman", label: "I." },
] as const;

export const UNORDERED_MARKER_OPTIONS = [
	{ value: "disc", label: "Disc" },
	{ value: "circle", label: "Circle" },
	{ value: "square", label: "Square" },
] as const;

export const FONT_SIZE_UNIT_OPTIONS = ["px", "em", "rem"] as const;
export const FONT_SIZE_SUGGESTIONS_BY_UNIT = {
	px: [10, 12, 14, 16, 18, 20, 24, 30, 36, 48, 64, 72, 96, 120],
	em: [0.625, 0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3, 4, 6, 7.5],
	rem: [0.625, 0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3, 4, 6, 7.5],
} as const;

export const BLOCK_SPACING_UNIT_OPTIONS = ["px", "em"] as const;
export const SYSTEM_FONT_VALUE = "__system-font__";

export type ToolbarFontUnit = (typeof FONT_SIZE_UNIT_OPTIONS)[number];
export type ToolbarSpacingUnit = (typeof BLOCK_SPACING_UNIT_OPTIONS)[number];

export type RichToolbarState = {
	boldActive: boolean;
	italicActive: boolean;
	underlineActive: boolean;
	strikethroughActive: boolean;
	linkActive: boolean;
	structureMode: "block" | "ul" | "ol" | "code-block" | null;
	selectedBlockType: RichTextBlockType;
	selectedListKind: "ul" | "ol" | null;
	selectedListMarkerStyle: string;
	selectedCodeLanguage: string;
	selectedLineHeight: number;
	selectedTextAlign: "left" | "center" | "right";
	selectedDirection: "ltr" | "rtl";
	currentFontFamily: string;
	currentFontWeight: number;
	currentFontSize: string;
	currentTextColor: string;
	currentHighlightColor: string;
};
