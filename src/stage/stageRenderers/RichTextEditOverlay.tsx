import {
	type CSSProperties,
	type FormEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type FocusEvent as ReactFocusEvent,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import {
	Code2,
	Link2,
	List,
	ListOrdered,
	MoveVertical,
	Type,
	UnfoldVertical,
} from "lucide-react";
import {
	Editor,
	Range,
	Text,
	Transforms,
	type BaseSelection,
	type Descendant,
} from "slate";
import {
	Editable,
	ReactEditor,
	type RenderElementProps,
	type RenderLeafProps,
	Slate,
} from "slate-react";
import { Button } from "@/components/ui/button";
import { FloatingPanelShell } from "@/components/ui/floating-panel-shell";
import { Input } from "@/components/ui/input";
import { PopoverTooltip } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import {
	ValueWithUnit,
	type ValueWithUnitOption,
	type ValueWithUnitSuggestion,
} from "@/components/ui/value-with-unit";
import {
	getSectionAnchorOptions,
	getLinkHref,
	isValidSectionAnchorTarget,
} from "../../model/links";
import {
	convertRenderedPxToFontRelativeUnit,
	convertRenderedPxToSpacingUnit,
	formatDisplayValue,
} from "../../model/conversion";
import type {
	DocumentModel,
	NodeId,
	RichBlock,
	RichTextBlock,
	TextDocumentContent,
	RichTextBlockType,
	RichTextLeaf,
	RichTextLink,
} from "../../model/types";
import {
	createTextDocumentContent,
	getTextDocumentBlockGap,
} from "../../model/richContent";
import {
	parseFontSizeValue,
	parseSpacingValue,
	resolveFontSizePx,
	resolveSpacingPx,
} from "../../model/units";
import { CODE_LANGUAGE_OPTIONS } from "../../render/codeHighlight";
import {
	getDefaultListContainerStyle,
	getRichTextBlockTag,
	richLeafStyle,
} from "../../render/nodePresentation";
import {
	convertSelectionToBlockType,
	convertSelectionToCodeBlock,
	convertSelectionToList,
	createRichEditor,
	fromSlateValue,
	getMarkValue,
	getSelectedBlockType,
	getSelectedCodeLanguage,
	getSelectedLineHeight,
	getSelectedListKind,
	getSelectedListMarkerStyle,
	getSelectedStructureMode,
	insertLink,
	isLinkActive,
	isMarkActive,
	removeLink,
	setMarkValue,
	setSelectedCodeBlockLanguage,
	setSelectedBlocksLineHeight,
	setSelectedListMarkerStyle,
	toSlateValue,
	toggleMark,
} from "../../render/richTextEditor";
import {
	clampRichToolbarOffset,
	DEFAULT_RICH_TOOLBAR_OFFSET,
	getRichToolbarViewportPosition,
	persistRichToolbarSessionOffset,
	readRichToolbarSessionOffset,
	RICH_TOOLBAR_EDGE_GAP_PX,
	type RichToolbarOffset,
	type RichToolbarPlacement,
} from "./richToolbarPosition";

type RetainedSelectionLeaf = RichTextLeaf & { retainedSelection?: boolean };

function renderEditLeaf({ attributes, children, leaf }: RenderLeafProps) {
	const editLeaf = leaf as RetainedSelectionLeaf;
	const style = richLeafStyle(editLeaf);
	return (
		<span
			{...attributes}
			data-retained-selection={
				editLeaf.retainedSelection ? "true" : undefined
			}
			style={{
				...style,
				...(editLeaf.retainedSelection
					? {
							backgroundColor:
								"color-mix(in srgb, var(--editor-accent) 32%, transparent)",
							borderRadius: "2px",
						}
					: {}),
				pointerEvents: "auto",
				userSelect: "text",
				WebkitUserSelect: "text",
			}}
		>
			{children}
		</span>
	);
}

function renderEditElement(
	{ attributes, children, element }: RenderElementProps,
	documentModel: DocumentModel | undefined,
) {
	const el = element as RichTextLink | RichBlock | { type?: string };
	if ("type" in el && el.type === "link") {
		const link = el as RichTextLink;
		const href = getLinkHref(link, documentModel);
		return (
			<a
				href={href}
				style={{
					textDecoration: "underline",
					cursor: "text",
					pointerEvents: "auto",
					userSelect: "text",
					WebkitUserSelect: "text",
				}}
				{...attributes}
			>
				{children}
			</a>
		);
	}

	const block = el as RichBlock;
	const blockLineHeight =
		isEditableTextBlock(block) && typeof block.lineHeight === "number"
			? block.lineHeight
			: undefined;
	const Tag =
		block.type === "ul" || block.type === "ol"
			? block.type
			: block.type === "code-block"
				? "div"
				: getRichTextBlockTag(block.type);
	return (
		<Tag
			{...attributes}
			data-rich-block-type={
				block.type === "code-block" ? "code-block" : undefined
			}
			style={{
				...(block.type === "ul" || block.type === "ol"
					? getDefaultListContainerStyle()
					: {}),
				...(blockLineHeight !== undefined
					? { lineHeight: blockLineHeight }
					: {}),
				pointerEvents: "auto",
				userSelect: "text",
				WebkitUserSelect: "text",
			}}
		>
			{children}
		</Tag>
	);
}

function isEditableTextBlock(block: RichBlock): block is RichTextBlock {
	return (
		block.type !== "code-block" && block.type !== "ul" && block.type !== "ol"
	);
}

type LinkPopoverDraft = {
	open: boolean;
	linkType: "external" | "page" | "anchor";
	href: string;
	targetPageId: string;
	pageAnchorId: string;
	anchorTargetId: string;
};

const DEFAULT_LINK_POPOVER: LinkPopoverDraft = {
	open: false,
	linkType: "external",
	href: "",
	targetPageId: "",
	pageAnchorId: "",
	anchorTargetId: "",
};

type ToolbarDragState = {
	pointerId: number;
	originX: number;
	originY: number;
	originOffset: RichToolbarOffset;
	rootRect: DOMRect;
	panelWidth: number;
	panelHeight: number;
};

const RICH_SELECT_IDS = {
	fontFamily: "font-family",
	blockType: "block-type",
	orderedListMarker: "ordered-list-marker",
	unorderedListMarker: "unordered-list-marker",
	codeLanguage: "code-language",
	linkType: "link-type",
	sectionTarget: "section-target",
	targetPage: "target-page",
	targetPageSection: "target-page-section",
} as const;

type RichEditSelectId = (typeof RICH_SELECT_IDS)[keyof typeof RICH_SELECT_IDS];

const BLOCK_TYPE_OPTIONS: Array<{ value: RichTextBlockType; label: string }> = [
	{ value: "paragraph", label: "Paragraph" },
	{ value: "div", label: "Div" },
	{ value: "blockquote", label: "Quote" },
	{ value: "h1", label: "H1" },
	{ value: "h2", label: "H2" },
	{ value: "h3", label: "H3" },
	{ value: "h4", label: "H4" },
	{ value: "h5", label: "H5" },
	{ value: "h6", label: "H6" },
];

const ORDERED_MARKER_OPTIONS = [
	{ value: "decimal", label: "1." },
	{ value: "lower-alpha", label: "a." },
	{ value: "upper-alpha", label: "A." },
	{ value: "lower-roman", label: "i." },
	{ value: "upper-roman", label: "I." },
] as const;

const UNORDERED_MARKER_OPTIONS = [
	{ value: "disc", label: "Disc" },
	{ value: "circle", label: "Circle" },
	{ value: "square", label: "Square" },
] as const;

const FONT_SIZE_UNIT_OPTIONS = ["px", "em", "rem"] as const;
const FONT_SIZE_SUGGESTIONS_BY_UNIT = {
	px: [12, 14, 16, 18, 20, 24, 30, 36, 48, 64, 72],
	em: [0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3, 4],
	rem: [0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3, 4],
} as const;
const BLOCK_SPACING_UNIT_OPTIONS = ["px", "em"] as const;

type RichToolbarState = {
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
	currentFontFamily: string;
	currentFontSize: string;
	currentTextColor: string;
	currentHighlightColor: string;
};

type ToolbarFontUnit = (typeof FONT_SIZE_UNIT_OPTIONS)[number];
type ToolbarSpacingUnit = (typeof BLOCK_SPACING_UNIT_OPTIONS)[number];

function cloneSelection(selection: BaseSelection): BaseSelection {
	if (!selection) {
		return null;
	}

	return {
		anchor: { ...selection.anchor },
		focus: { ...selection.focus },
	};
}

function readToolbarFontReference(element: HTMLElement | null) {
	const ownerDocument = element?.ownerDocument ?? globalThis.document;
	const defaultView = ownerDocument?.defaultView ?? globalThis.window;
	if (!ownerDocument || !defaultView) {
		return { rootFontSizePx: 16, inheritedFontSizePx: 16 };
	}

	const rootComputed = defaultView.getComputedStyle(ownerDocument.documentElement);
	const inheritedComputed = defaultView.getComputedStyle(
		element ?? ownerDocument.documentElement,
	);
	const rootFontSizePx = Number.parseFloat(rootComputed.fontSize);
	const inheritedFontSizePx = Number.parseFloat(inheritedComputed.fontSize);
	return {
		rootFontSizePx:
			Number.isFinite(rootFontSizePx) && rootFontSizePx > 0 ? rootFontSizePx : 16,
		inheritedFontSizePx:
			Number.isFinite(inheritedFontSizePx) && inheritedFontSizePx > 0
				? inheritedFontSizePx
				: 16,
	};
}

function readFontSizeDraftState(value: string) {
	try {
		const parsed = parseFontSizeValue(value);
		return {
			draft: formatDisplayValue(parsed.parsed.value),
			unit: parsed.parsed.unit as ToolbarFontUnit,
			valid: true,
		};
	} catch {
		return {
			draft: "",
			unit: "px" as ToolbarFontUnit,
			valid: false,
		};
	}
}

function readSpacingDraftState(value: string) {
	try {
		const parsed = parseSpacingValue(value);
		return {
			draft: formatDisplayValue(parsed.parsed.value),
			unit: parsed.parsed.unit as ToolbarSpacingUnit,
			valid: true,
		};
	} catch {
		return {
			draft: "",
			unit: "px" as ToolbarSpacingUnit,
			valid: false,
		};
	}
}

function isSelectVisibleForStructureMode(
	selectId: RichEditSelectId,
	structureMode: RichToolbarState["structureMode"],
) {
	switch (selectId) {
		case RICH_SELECT_IDS.blockType:
			return structureMode === "block";
		case RICH_SELECT_IDS.orderedListMarker:
			return structureMode === "ol";
		case RICH_SELECT_IDS.unorderedListMarker:
			return structureMode === "ul";
		case RICH_SELECT_IDS.codeLanguage:
			return structureMode === "code-block";
		default:
			return true;
	}
}

function readToolbarState(
	editor: ReturnType<typeof createRichEditor>,
): RichToolbarState {
	return {
		boldActive: isMarkActive(editor, "bold"),
		italicActive: isMarkActive(editor, "italic"),
		underlineActive: isMarkActive(editor, "underline"),
		strikethroughActive: isMarkActive(editor, "strikethrough"),
		linkActive: isLinkActive(editor),
		structureMode: getSelectedStructureMode(editor),
		selectedBlockType: getSelectedBlockType(editor) ?? "paragraph",
		selectedListKind: getSelectedListKind(editor),
		selectedListMarkerStyle: getSelectedListMarkerStyle(editor),
		selectedCodeLanguage: getSelectedCodeLanguage(editor),
		selectedLineHeight: getSelectedLineHeight(editor),
		currentFontFamily: getMarkValue(editor, "fontFamily") || "__inherit__",
		currentFontSize: getMarkValue(editor, "fontSize"),
		currentTextColor: normalizeColorInputValue(
			getMarkValue(editor, "color"),
			"#111827",
		),
		currentHighlightColor: normalizeColorInputValue(
			getMarkValue(editor, "backgroundColor"),
			"#fff59d",
		),
	};
}

function isTargetWithinSelector(
	target: EventTarget | null,
	selector: string,
): boolean {
	if (!(target instanceof Element)) {
		return false;
	}

	return Boolean(target.closest(selector));
}

function isTargetWithinSelectLayer(
	target: EventTarget | null,
	selectId: RichEditSelectId,
): boolean {
	return isTargetWithinSelector(
		target,
		`[data-stage-rich-select-id="${selectId}"]`,
	);
}

function isTargetWithinLinkPopover(target: EventTarget | null): boolean {
	return isTargetWithinSelector(
		target,
		'[data-stage-rich-link-popover="true"]',
	);
}

function isTargetWithinToolbar(target: EventTarget | null): boolean {
	return isTargetWithinSelector(target, '[data-stage-rich-toolbar="true"]');
}

export function RichTextEditOverlay({
	nodeId,
	content,
	contentStyle,
	minHeight,
	document: documentModel,
	onCommit,
	onUpdateBlockGap,
	onDiscard,
}: {
	nodeId: NodeId;
	content: TextDocumentContent;
	contentStyle?: CSSProperties;
	minHeight?: string;
	document?: DocumentModel;
	onCommit: (id: NodeId, content: TextDocumentContent) => void;
	onUpdateBlockGap: (id: NodeId, value: number) => void;
	onDiscard: () => void;
}) {
	const editor = useMemo(() => createRichEditor(), []);
	const initialValue = useMemo(() => toSlateValue(content.blocks), [content]);
	const rootRef = useRef<HTMLDivElement | null>(null);
	const toolbarRef = useRef<HTMLDivElement | null>(null);
	const [linkPopover, setLinkPopover] =
		useState<LinkPopoverDraft>(DEFAULT_LINK_POPOVER);
	const [linkSelection, setLinkSelection] = useState<BaseSelection>(null);
	const [openSelectId, setOpenSelectId] = useState<RichEditSelectId | null>(
		null,
	);
	const [toolbarSelection, setToolbarSelection] = useState<BaseSelection>(null);
	const [editorFocused, setEditorFocused] = useState(true);
	const [selectionRevision, setSelectionRevision] = useState(0);
	const [toolbarState, setToolbarState] = useState<RichToolbarState>(() =>
		readToolbarState(editor),
	);
	const [lineHeightDraft, setLineHeightDraft] = useState(() =>
		String(readToolbarState(editor).selectedLineHeight),
	);
	const toolbarDragRef = useRef<ToolbarDragState | null>(null);
	const toolbarOffsetDraftRef = useRef<RichToolbarOffset>(
		DEFAULT_RICH_TOOLBAR_OFFSET,
	);
	const [toolbarOffsetDraft, setToolbarOffsetDraft] =
		useState<RichToolbarOffset>(() => readRichToolbarSessionOffset());
	const [toolbarDragging, setToolbarDragging] = useState(false);
	const [toolbarPlacement, setToolbarPlacement] =
		useState<RichToolbarPlacement>("above");
	const [toolbarPosition, setToolbarPosition] = useState({
		top: RICH_TOOLBAR_EDGE_GAP_PX,
		left: RICH_TOOLBAR_EDGE_GAP_PX,
	});
	const [toolbarWidth, setToolbarWidth] = useState(0);
	const [toolbarLayoutRevision, setToolbarLayoutRevision] = useState(0);

	useEffect(() => {
		const id = requestAnimationFrame(() => {
			try {
				ReactEditor.focus(editor);
			} catch {}
		});
		return () => cancelAnimationFrame(id);
	}, [editor]);

	useEffect(() => {
		toolbarOffsetDraftRef.current = toolbarOffsetDraft;
	}, [toolbarOffsetDraft]);

	useEffect(() => {
		let frame = 0;

		function queueToolbarLayoutRefresh() {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				setToolbarLayoutRevision((revision) => revision + 1);
			});
		}

		window.addEventListener("resize", queueToolbarLayoutRefresh);
		window.addEventListener("scroll", queueToolbarLayoutRefresh, true);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("resize", queueToolbarLayoutRefresh);
			window.removeEventListener("scroll", queueToolbarLayoutRefresh, true);
		};
	}, []);

	useEffect(() => {
		if (!toolbarDragging || typeof document === "undefined") {
			return;
		}

		const { cursor, userSelect } = document.body.style;
		document.body.style.cursor = "grabbing";
		document.body.style.userSelect = "none";

		return () => {
			document.body.style.cursor = cursor;
			document.body.style.userSelect = userSelect;
		};
	}, [toolbarDragging]);

	useEffect(() => {
		if (!toolbarDragging) {
			return;
		}

		function finishToolbarDrag(nextOffset: RichToolbarOffset) {
			toolbarDragRef.current = null;
			setToolbarDragging(false);
			setToolbarOffsetDraft(nextOffset);
			persistRichToolbarSessionOffset(nextOffset);
		}

		function handlePointerMove(event: PointerEvent) {
			if (
				!toolbarDragRef.current ||
				event.pointerId !== toolbarDragRef.current.pointerId
			) {
				return;
			}

			event.preventDefault();
			const nextOffset = clampRichToolbarOffset({
				rootRect: toolbarDragRef.current.rootRect,
				panelWidth: toolbarDragRef.current.panelWidth,
				panelHeight: toolbarDragRef.current.panelHeight,
				viewportWidth: window.innerWidth,
				viewportHeight: window.innerHeight,
				offset: toolbarDragRef.current.originOffset,
				deltaX: event.clientX - toolbarDragRef.current.originX,
				deltaY: event.clientY - toolbarDragRef.current.originY,
			});
			toolbarOffsetDraftRef.current = nextOffset;
			const nextViewportPosition = getRichToolbarViewportPosition({
				rootRect: toolbarDragRef.current.rootRect,
				panelWidth: toolbarDragRef.current.panelWidth,
				panelHeight: toolbarDragRef.current.panelHeight,
				viewportWidth: window.innerWidth,
				viewportHeight: window.innerHeight,
				offset: nextOffset,
			});
			setToolbarPlacement((current) =>
				current === nextViewportPosition.placement
					? current
					: nextViewportPosition.placement,
			);
			setToolbarPosition((current) =>
				current.top === nextViewportPosition.top &&
				current.left === nextViewportPosition.left
					? current
					: { top: nextViewportPosition.top, left: nextViewportPosition.left },
			);
		}

		function handlePointerEnd(event: PointerEvent) {
			if (
				!toolbarDragRef.current ||
				event.pointerId !== toolbarDragRef.current.pointerId
			) {
				return;
			}
			finishToolbarDrag(toolbarOffsetDraftRef.current);
		}

		window.addEventListener("pointermove", handlePointerMove, { passive: false });
		window.addEventListener("pointerup", handlePointerEnd);
		window.addEventListener("pointercancel", handlePointerEnd);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerEnd);
			window.removeEventListener("pointercancel", handlePointerEnd);
		};
	}, [toolbarDragging]);

	useLayoutEffect(() => {
		void selectionRevision;
		void toolbarLayoutRevision;
		const root = rootRef.current;
		const toolbar = toolbarRef.current;
		if (!root || !toolbar) {
			return;
		}

		const rootRect = root.getBoundingClientRect();
		const toolbarRect = toolbar.getBoundingClientRect();
		const nextViewportPosition = getRichToolbarViewportPosition({
			rootRect,
			panelWidth: toolbarRect.width,
			panelHeight: toolbarRect.height,
			viewportWidth: window.innerWidth,
			viewportHeight: window.innerHeight,
			offset: toolbarOffsetDraft,
		});

		setToolbarPlacement((current) =>
			current === nextViewportPosition.placement
				? current
				: nextViewportPosition.placement,
		);
		setToolbarPosition((current) =>
			current.top === nextViewportPosition.top &&
			current.left === nextViewportPosition.left
				? current
				: { top: nextViewportPosition.top, left: nextViewportPosition.left },
		);
		setToolbarWidth((current) =>
			current === toolbarRect.width ? current : toolbarRect.width,
		);
	}, [selectionRevision, toolbarLayoutRevision, toolbarOffsetDraft]);

	const commitCurrentContent = useCallback(() => {
		onCommit(
			nodeId,
			createTextDocumentContent(fromSlateValue(editor.children), {
				blockGap: getTextDocumentBlockGap(content),
			}),
		);
	}, [content, editor, nodeId, onCommit]);

	const closeOpenSelect = useCallback(() => {
		setOpenSelectId(null);
	}, []);

	const closeLinkPopover = useCallback(() => {
		setOpenSelectId(null);
		setLinkSelection(null);
		setLinkPopover(DEFAULT_LINK_POPOVER);
	}, []);

	const handleSelectOpenChange = useCallback(
		(selectId: RichEditSelectId, open: boolean) => {
			setOpenSelectId((current) => {
				if (open) {
					return selectId;
				}
				return current === selectId ? null : current;
			});
		},
		[],
	);

	useEffect(() => {
		function handlePointerDown(event: PointerEvent) {
			const root = rootRef.current;
			if (!root) {
				return;
			}
			const target = event.target;
			if (openSelectId) {
				if (isTargetWithinSelectLayer(target, openSelectId)) {
					return;
				}
				event.preventDefault();
				event.stopPropagation();
				closeOpenSelect();
				return;
			}
			if (linkPopover.open) {
				if (isTargetWithinLinkPopover(target)) {
					return;
				}
				event.preventDefault();
				event.stopPropagation();
				closeLinkPopover();
				return;
			}
			if (isTargetWithinToolbar(target)) {
				return;
			}
			if (target instanceof Node && root.contains(target)) {
				return;
			}
			commitCurrentContent();
		}

		globalThis.document?.addEventListener(
			"pointerdown",
			handlePointerDown,
			true,
		);
		return () => {
			globalThis.document?.removeEventListener(
				"pointerdown",
				handlePointerDown,
				true,
			);
		};
	}, [
		closeLinkPopover,
		closeOpenSelect,
		commitCurrentContent,
		linkPopover.open,
		openSelectId,
	]);

	useEffect(() => {
		function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
			if (event.key !== "Escape") {
				return;
			}

			if (openSelectId) {
				event.preventDefault();
				event.stopPropagation();
				closeOpenSelect();
				return;
			}

			if (linkPopover.open) {
				event.preventDefault();
				event.stopPropagation();
				closeLinkPopover();
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			onDiscard();
		}

		globalThis.document?.addEventListener("keydown", handleGlobalKeyDown, true);
		return () => {
			globalThis.document?.removeEventListener(
				"keydown",
				handleGlobalKeyDown,
				true,
			);
		};
	}, [
		closeLinkPopover,
		closeOpenSelect,
		linkPopover.open,
		onDiscard,
		openSelectId,
	]);

	const fontFamilies = useMemo(() => {
		const defaults = documentModel?.fontLibrary.defaults ?? [];
		const used =
			documentModel?.fontLibrary.usedFamilies.map((family) => family.family) ??
			[];
		return ["__inherit__", ...new Set([...defaults, ...used])];
	}, [documentModel]);

	const pages = documentModel?.pages ?? [];
	const sectionOptions = useMemo(
		() => (documentModel ? getSectionAnchorOptions(documentModel) : []),
		[documentModel],
	);

	const targetPage = pages.find((page) => page.id === linkPopover.targetPageId);
	const targetPageSectionOptions = useMemo(() => {
		if (!documentModel || !targetPage) {
			return [];
		}
		return targetPage.sectionIds
			.map((sectionId) => {
				const sectionNode = documentModel.nodes[sectionId];
				if (!sectionNode) {
					return null;
				}
				return { id: sectionId, name: sectionNode.name || sectionId };
			})
			.filter(
				(option): option is { id: string; name: string } => option !== null,
			);
	}, [documentModel, targetPage]);

	const {
		boldActive,
		italicActive,
		underlineActive,
		strikethroughActive,
		linkActive,
		structureMode,
		selectedBlockType,
		selectedListKind,
		selectedListMarkerStyle,
		selectedCodeLanguage,
		currentFontFamily,
		currentTextColor,
		currentHighlightColor,
	} = toolbarState;
	const currentBlockSpacingValue = `${String(
		getTextDocumentBlockGap(content) ?? readInitialBlockSpacing(contentStyle),
	)}px`;

	useEffect(() => {
		setLineHeightDraft(String(toolbarState.selectedLineHeight));
	}, [toolbarState.selectedLineHeight]);

	useEffect(() => {
		if (
			openSelectId &&
			!isSelectVisibleForStructureMode(openSelectId, structureMode)
		) {
			setOpenSelectId(null);
		}
	}, [openSelectId, structureMode]);

	const syncToolbarState = useCallback(() => {
		setToolbarState(readToolbarState(editor));
	}, [editor]);

	const handleKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLDivElement>) => {
			if (event.key === "Escape") {
				return;
			}

			const isMod = event.metaKey || event.ctrlKey;
			if (isMod && event.key === "Enter") {
				event.preventDefault();
				commitCurrentContent();
				return;
			}

			if (isMod && event.key === "b") {
				event.preventDefault();
				toggleMark(editor, "bold");
				syncToolbarState();
				setSelectionRevision((revision) => revision + 1);
				return;
			}

			if (isMod && event.key === "i") {
				event.preventDefault();
				toggleMark(editor, "italic");
				syncToolbarState();
				setSelectionRevision((revision) => revision + 1);
				return;
			}

			if (isMod && event.key === "k") {
				event.preventDefault();
				if (isLinkActive(editor)) {
					removeLink(editor);
					closeLinkPopover();
					syncToolbarState();
					setSelectionRevision((revision) => revision + 1);
				} else {
					const currentSelection = editor.selection
						? {
								anchor: { ...editor.selection.anchor },
								focus: { ...editor.selection.focus },
							}
						: null;
					setLinkSelection(currentSelection);
					setLinkPopover({
						...DEFAULT_LINK_POPOVER,
						open: true,
						anchorTargetId: sectionOptions[0]?.id ?? "",
						href: sectionOptions[0]?.href ?? "",
						targetPageId: pages[0]?.id ?? "",
					});
				}
			}
		},
		[
			closeLinkPopover,
			commitCurrentContent,
			editor,
			pages,
			sectionOptions,
			syncToolbarState,
		],
	);

	const restoreToolbarSelection = useCallback(() => {
		const selectionToRestore = linkSelection ?? toolbarSelection;
		if (!selectionToRestore) {
			return false;
		}

		ReactEditor.focus(editor);
		Transforms.select(editor, selectionToRestore);
		return true;
	}, [editor, linkSelection, toolbarSelection]);

	const retainedSelection = linkSelection ?? toolbarSelection;

	const decorateRetainedSelection = useCallback(
		([node, path]: [Descendant, number[]]) => {
			if (
				editorFocused ||
				!retainedSelection ||
				Range.isCollapsed(retainedSelection) ||
				!Text.isText(node)
			) {
				return [];
			}

			const nodeRange = Editor.range(editor, path);
			const intersection = Range.intersection(retainedSelection, nodeRange);
			return intersection
				? [{ ...intersection, retainedSelection: true }]
				: [];
		},
		[editor, editorFocused, retainedSelection],
	);

	const handleBooleanMark = useCallback(
		(mark: "bold" | "italic" | "underline" | "strikethrough") => {
			restoreToolbarSelection();
			toggleMark(editor, mark);
			syncToolbarState();
			setSelectionRevision((revision) => revision + 1);
			requestAnimationFrame(() => {
				try {
					ReactEditor.focus(editor);
				} catch {}
			});
		},
		[editor, restoreToolbarSelection, syncToolbarState],
	);

	const handleValueMark = useCallback(
		(
			mark: "color" | "backgroundColor" | "fontFamily" | "fontSize",
			value: string,
		) => {
			restoreToolbarSelection();
			setMarkValue(editor, mark, value === "__inherit__" ? "" : value);
			syncToolbarState();
			setSelectionRevision((revision) => revision + 1);
		},
		[editor, restoreToolbarSelection, syncToolbarState],
	);

	const handleBlockSpacingCommit = useCallback(
		(value: string) => {
			try {
				const parsed = parseSpacingValue(value);
				const nextPx = resolveSpacingPx(
					parsed.parsed,
					readToolbarFontReference(rootRef.current),
				);
				if (!Number.isFinite(nextPx) || nextPx < 0) {
					return;
				}
				onUpdateBlockGap(nodeId, nextPx);
			} catch {}
		},
		[nodeId, onUpdateBlockGap],
	);

	const handleToolbarDragPointerDown = useCallback(
		(event: ReactPointerEvent<HTMLButtonElement>) => {
			if (event.button !== 0 || !rootRef.current || !toolbarRef.current) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			try {
				event.currentTarget.setPointerCapture(event.pointerId);
			} catch {}
			const rootRect = rootRef.current.getBoundingClientRect();
			const toolbarRect = toolbarRef.current.getBoundingClientRect();
			toolbarDragRef.current = {
				pointerId: event.pointerId,
				originX: event.clientX,
				originY: event.clientY,
				originOffset: toolbarOffsetDraftRef.current,
				rootRect,
				panelWidth: toolbarRect.width,
				panelHeight: toolbarRect.height,
			};
			setToolbarWidth((current) =>
				current === toolbarRect.width ? current : toolbarRect.width,
			);
			setToolbarDragging(true);
		},
		[],
	);

	const handleLinkAction = useCallback(() => {
		if (isLinkActive(editor)) {
			removeLink(editor);
			closeLinkPopover();
			syncToolbarState();
			setSelectionRevision((revision) => revision + 1);
			return;
		}

		const currentSelection = cloneSelection(editor.selection);
		setLinkSelection(currentSelection);
		setLinkPopover({
			...DEFAULT_LINK_POPOVER,
			open: true,
			anchorTargetId: sectionOptions[0]?.id ?? "",
			href: "",
			targetPageId: pages[0]?.id ?? "",
		});
	}, [closeLinkPopover, editor, pages, sectionOptions, syncToolbarState]);

	const handleLinkSubmit = useCallback(
		(event: FormEvent) => {
			event.preventDefault();

			if (linkPopover.linkType === "external" && !linkPopover.href.trim()) {
				setLinkSelection(null);
				setLinkPopover(DEFAULT_LINK_POPOVER);
				return;
			}

			restoreToolbarSelection();

			insertLink(editor, {
				type: "link",
				linkType: linkPopover.linkType,
				...(linkPopover.linkType === "external"
					? { href: linkPopover.href.trim(), openInNewTab: false }
					: {}),
				...(linkPopover.linkType === "page"
					? {
							targetPageId: linkPopover.targetPageId || undefined,
							pageAnchorId: linkPopover.pageAnchorId || undefined,
						}
					: {}),
				...(linkPopover.linkType === "anchor"
					? {
							anchorTargetId:
								documentModel &&
								isValidSectionAnchorTarget(
									documentModel,
									linkPopover.anchorTargetId,
								)
									? linkPopover.anchorTargetId
									: undefined,
							href: sectionOptions.find(
								(option) => option.id === linkPopover.anchorTargetId,
							)?.href,
						}
					: {}),
			});
			closeLinkPopover();
			syncToolbarState();
			setSelectionRevision((revision) => revision + 1);
		},
		[
			closeLinkPopover,
			documentModel,
			editor,
			linkPopover,
			restoreToolbarSelection,
			sectionOptions,
			syncToolbarState,
		],
	);

	const commitFontSizeDraft = useCallback(
		(value: string) => {
			handleValueMark("fontSize", value);
		},
		[handleValueMark],
	);

	const commitLineHeightDraft = useCallback(() => {
		const parsed = Number.parseFloat(lineHeightDraft);
		if (!Number.isFinite(parsed) || parsed <= 0) {
			setLineHeightDraft(String(toolbarState.selectedLineHeight));
			return;
		}

		restoreToolbarSelection();
		setSelectedBlocksLineHeight(editor, parsed);
		syncToolbarState();
		setSelectionRevision((revision) => revision + 1);
	}, [
		editor,
		lineHeightDraft,
		restoreToolbarSelection,
		syncToolbarState,
		toolbarState.selectedLineHeight,
	]);

	const toolbarChrome = (
		<>
			<FloatingPanelShell
				ref={toolbarRef}
				suppressPopover
				open
				data-stage-rich-toolbar="true"
				style={{
					top: `${toolbarPosition.top}px`,
					left: `${toolbarPosition.left}px`,
					zIndex: 220,
					width: "max-content",
					maxWidth: "calc(100vw - 32px)",
					pointerEvents: "auto",
				}}
				bodyClassName="px-2 py-2"
				bodyStyle={{
					pointerEvents: "auto",
					overflowX: "auto",
					overflowY: "hidden",
				}}
				onPointerDown={(event) => {
					event.stopPropagation();
				}}
			>
				<div className="flex items-stretch gap-2">
					<button
						type="button"
						aria-label="Drag text toolbar"
						data-stage-rich-toolbar-drag-handle="true"
						data-dragging={toolbarDragging ? "true" : "false"}
						className={
							toolbarDragging
								? "flex shrink-0 cursor-grabbing select-none touch-none self-center rounded-md px-1.5 py-3"
								: "flex shrink-0 cursor-grab touch-none self-center rounded-md px-1.5 py-3"
						}
						onClick={(event) => event.preventDefault()}
						onPointerDown={handleToolbarDragPointerDown}
					>
						<div className="h-12 w-1 rounded-full bg-[color-mix(in_srgb,var(--editor-border-subtle)_80%,white)]" />
					</button>
					<div className="space-y-1.5">
						<div className="flex items-center gap-1.5">
							<CompactSelect
								selectId={RICH_SELECT_IDS.fontFamily}
								open={openSelectId === RICH_SELECT_IDS.fontFamily}
								onOpenChange={(open) =>
									handleSelectOpenChange(RICH_SELECT_IDS.fontFamily, open)
								}
								label="Font family"
								value={currentFontFamily}
								onValueChange={(value) => handleValueMark("fontFamily", value)}
								options={fontFamilies.map((family) => ({
									value: family,
									label: family === "__inherit__" ? "Inherit" : family,
								}))}
								width={132}
							/>
							<CompactFontSizeField
								label="Font size"
								value={toolbarState.currentFontSize}
								width={90}
								onCommit={commitFontSizeDraft}
								resolveUnitValue={(nextUnit, currentValue) => {
									try {
										const parsed = parseFontSizeValue(currentValue);
										const nextValue = convertRenderedPxToFontRelativeUnit(
											resolveFontSizePx(
												parsed.parsed,
												readToolbarFontReference(rootRef.current),
											),
											nextUnit,
											readToolbarFontReference(rootRef.current),
										);
										return nextValue == null
											? null
											: `${formatDisplayValue(nextValue)}${nextUnit}`;
									} catch {
										return null;
									}
								}}
							/>
							<ToolbarButton
								label="Bold"
								active={boldActive}
								onActivate={() => handleBooleanMark("bold")}
							>
								<span className="font-black tracking-[-0.02em]">B</span>
							</ToolbarButton>
							<ToolbarButton
								label="Italic"
								active={italicActive}
								onActivate={() => handleBooleanMark("italic")}
							>
								<span className="font-medium italic">I</span>
							</ToolbarButton>
							<ToolbarButton
								label="Underline"
								active={underlineActive}
								onActivate={() => handleBooleanMark("underline")}
							>
								<span className="underline">U</span>
							</ToolbarButton>
							<ToolbarButton
								label="Strikethrough"
								active={strikethroughActive}
								onActivate={() => handleBooleanMark("strikethrough")}
							>
								<span className="line-through">S</span>
							</ToolbarButton>
							<CompactColorField
								label="Text color"
								value={currentTextColor}
								onChange={(value) => handleValueMark("color", value)}
							/>
							<CompactColorField
								label="Highlight color"
								value={currentHighlightColor}
								onChange={(value) => handleValueMark("backgroundColor", value)}
							/>
							<ToolbarButton
								label={linkActive ? "Unlink" : "Link"}
								active={linkActive || linkPopover.open}
								onActivate={handleLinkAction}
							>
								<Link2 size={14} />
							</ToolbarButton>
						</div>
						<div className="flex items-center gap-1.5">
							<ToolbarButton
								label="Use text block"
								active={structureMode === "block"}
								onActivate={() => {
									restoreToolbarSelection();
									convertSelectionToBlockType(editor, selectedBlockType);
									syncToolbarState();
									setSelectionRevision((revision) => revision + 1);
								}}
							>
								<Type size={14} />
							</ToolbarButton>
							{structureMode === "block" ? (
								<CompactSelect
									selectId={RICH_SELECT_IDS.blockType}
									open={openSelectId === RICH_SELECT_IDS.blockType}
									onOpenChange={(open) =>
										handleSelectOpenChange(RICH_SELECT_IDS.blockType, open)
									}
									label="Block type"
									value={selectedBlockType}
									onValueChange={(value) => {
										restoreToolbarSelection();
										convertSelectionToBlockType(
											editor,
											value as RichTextBlockType,
										);
										syncToolbarState();
										setSelectionRevision((revision) => revision + 1);
									}}
									options={BLOCK_TYPE_OPTIONS.map((option) => ({
										value: option.value,
										label: option.label,
									}))}
									width={112}
								/>
							) : null}
							<ToolbarButton
								label="Use code block"
								active={structureMode === "code-block"}
								onActivate={() => {
									restoreToolbarSelection();
									convertSelectionToCodeBlock(
										editor,
										selectedCodeLanguage || "plaintext",
									);
									syncToolbarState();
									setSelectionRevision((revision) => revision + 1);
								}}
							>
								<Code2 size={14} />
							</ToolbarButton>
							<ToolbarButton
								label="Use ordered list"
								active={selectedListKind === "ol"}
								onActivate={() => {
									restoreToolbarSelection();
									convertSelectionToList(editor, "ol");
									syncToolbarState();
									setSelectionRevision((revision) => revision + 1);
								}}
							>
								<ListOrdered size={14} />
							</ToolbarButton>
							{structureMode === "ol" ? (
								<CompactSelect
									selectId={RICH_SELECT_IDS.orderedListMarker}
									open={openSelectId === RICH_SELECT_IDS.orderedListMarker}
									onOpenChange={(open) =>
										handleSelectOpenChange(
											RICH_SELECT_IDS.orderedListMarker,
											open,
										)
									}
									label="Ordered list marker"
									value={
										selectedListKind === "ol"
											? selectedListMarkerStyle || "decimal"
											: "decimal"
									}
									onValueChange={(value) => {
										restoreToolbarSelection();
										setSelectedListMarkerStyle(
											editor,
											value as (typeof ORDERED_MARKER_OPTIONS)[number]["value"],
										);
										syncToolbarState();
										setSelectionRevision((revision) => revision + 1);
									}}
									options={ORDERED_MARKER_OPTIONS.map((option) => ({
										value: option.value,
										label: option.label,
									}))}
									width={88}
								/>
							) : null}
							<ToolbarButton
								label="Use unordered list"
								active={selectedListKind === "ul"}
								onActivate={() => {
									restoreToolbarSelection();
									convertSelectionToList(editor, "ul");
									syncToolbarState();
									setSelectionRevision((revision) => revision + 1);
								}}
							>
								<List size={14} />
							</ToolbarButton>
							{structureMode === "ul" ? (
								<CompactSelect
									selectId={RICH_SELECT_IDS.unorderedListMarker}
									open={openSelectId === RICH_SELECT_IDS.unorderedListMarker}
									onOpenChange={(open) =>
										handleSelectOpenChange(
											RICH_SELECT_IDS.unorderedListMarker,
											open,
										)
									}
									label="Unordered list marker"
									value={
										selectedListKind === "ul"
											? selectedListMarkerStyle || "disc"
											: "disc"
									}
									onValueChange={(value) => {
										restoreToolbarSelection();
										setSelectedListMarkerStyle(
											editor,
											value as (typeof UNORDERED_MARKER_OPTIONS)[number]["value"],
										);
										syncToolbarState();
										setSelectionRevision((revision) => revision + 1);
									}}
									options={UNORDERED_MARKER_OPTIONS.map((option) => ({
										value: option.value,
										label: option.label,
									}))}
									width={92}
								/>
							) : null}
							{structureMode === "code-block" ? (
								<CompactSelect
									selectId={RICH_SELECT_IDS.codeLanguage}
									open={openSelectId === RICH_SELECT_IDS.codeLanguage}
									onOpenChange={(open) =>
										handleSelectOpenChange(RICH_SELECT_IDS.codeLanguage, open)
									}
									label="Code language"
									value={selectedCodeLanguage || "plaintext"}
									onValueChange={(value) => {
										restoreToolbarSelection();
										setSelectedCodeBlockLanguage(editor, value);
										syncToolbarState();
										setSelectionRevision((revision) => revision + 1);
									}}
									options={CODE_LANGUAGE_OPTIONS}
									width={110}
								/>
							) : null}
							<CompactIconTextField
								label="Line height"
								icon={<MoveVertical size={14} />}
								value={lineHeightDraft}
								placeholder="1.2"
								width={72}
								onChange={setLineHeightDraft}
								onBlur={commitLineHeightDraft}
								onCommit={commitLineHeightDraft}
							/>
							<CompactSpacingField
								label="Block spacing"
								icon={<UnfoldVertical size={14} />}
								value={currentBlockSpacingValue}
								width={104}
								onCommit={handleBlockSpacingCommit}
								resolveUnitValue={(nextUnit, currentValue) => {
									try {
										const parsed = parseSpacingValue(currentValue);
										const nextValue = convertRenderedPxToSpacingUnit(
											resolveSpacingPx(
												parsed.parsed,
												readToolbarFontReference(rootRef.current),
											),
											nextUnit,
											readToolbarFontReference(rootRef.current),
										);
										return nextValue == null
											? null
											: `${formatDisplayValue(nextValue)}${nextUnit}`;
									} catch {
										return null;
									}
								}}
							/>
						</div>
					</div>
				</div>
			</FloatingPanelShell>
			{linkPopover.open ? (
				<LinkInsertPopover
					draft={linkPopover}
					placement={toolbarPlacement}
					toolbarLeft={toolbarPosition.left}
					toolbarTop={toolbarPosition.top}
					toolbarWidth={toolbarWidth}
					pages={pages}
					sectionOptions={sectionOptions}
					targetPageSectionOptions={targetPageSectionOptions}
					onChange={setLinkPopover}
					onCancel={() => {
						closeLinkPopover();
					}}
					openSelectId={openSelectId}
					onSelectOpenChange={handleSelectOpenChange}
					onSubmit={handleLinkSubmit}
				/>
			) : null}
		</>
	);
	const chromePortalTarget = globalThis.document?.body ?? null;

	return (
		<Slate
			editor={editor}
			initialValue={initialValue}
			onChange={() => {
				if (editor.selection) {
					setToolbarSelection(cloneSelection(editor.selection));
					setToolbarState(readToolbarState(editor));
				}
				setSelectionRevision((revision) => revision + 1);
			}}
		>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: stage edit root only stops propagation into the drag layer */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: stage edit root only stops propagation into the drag layer */}
			<div
				ref={rootRef}
				data-stage-rich-edit-root="true"
				style={{
					position: "relative",
					pointerEvents: "auto",
					userSelect: "text",
					WebkitUserSelect: "text",
				}}
				onPointerDown={(event) => event.stopPropagation()}
				onClick={(event) => event.stopPropagation()}
				onDoubleClick={(event) => event.stopPropagation()}
			>
				{chromePortalTarget
					? createPortal(toolbarChrome, chromePortalTarget)
					: toolbarChrome}
				<div
					data-stage-rich-edit-box="true"
					style={{
						...contentStyle,
						minHeight,
						padding: 0,
						borderRadius: 0,
						border: 0,
						background: "transparent",
						boxShadow: "none",
						pointerEvents: "auto",
						cursor: "text",
						userSelect: "text",
						WebkitUserSelect: "text",
					}}
				>
					<Editable
						decorate={decorateRetainedSelection}
						renderLeaf={renderEditLeaf}
						renderElement={(props) => renderEditElement(props, documentModel)}
						onKeyDown={handleKeyDown}
						onFocus={() => {
							setEditorFocused(true);
						}}
						onBlur={() => {
							setEditorFocused(false);
						}}
						style={{
							outline: "none",
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
							minHeight,
							pointerEvents: "auto",
							userSelect: "text",
							WebkitUserSelect: "text",
						}}
					/>
				</div>
				<span hidden>{selectionRevision}</span>
			</div>
		</Slate>
	);
}

function ToolbarButton({
	label,
	active,
	onActivate,
	children,
}: {
	label: string;
	active: boolean;
	onActivate: () => void;
	children: React.ReactNode;
}) {
	return (
		<PopoverTooltip
			side="top"
			align="center"
			className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
			content={<div className="leading-3.5 font-medium">{label}</div>}
		>
			<Button
				type="button"
				variant={active ? "default" : "outline"}
				size="sm"
				aria-label={label}
				aria-pressed={active}
				className="pointer-events-auto h-8 w-8 shrink-0 rounded-sm p-0 text-xs"
				style={{ pointerEvents: "auto" }}
				onPointerDown={(event) => {
					event.preventDefault();
					event.stopPropagation();
				}}
				onClick={onActivate}
			>
				{children}
			</Button>
		</PopoverTooltip>
	);
}

function preserveRichSelectionPointerDown(event: {
	preventDefault: () => void;
	stopPropagation: () => void;
}) {
	event.preventDefault();
	event.stopPropagation();
}

function CompactSelect({
	selectId,
	open,
	onOpenChange,
	label,
	value,
	onValueChange,
	options,
	width,
}: {
	selectId: RichEditSelectId;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	label: string;
	value: string;
	onValueChange: (value: string) => void;
	options: Array<{ value: string; label: string }>;
	width: number;
}) {
	return (
		<PopoverTooltip
			side="top"
			align="center"
			className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
			content={<div className="leading-3.5 font-medium">{label}</div>}
		>
			<Select
				open={open}
				onOpenChange={onOpenChange}
				value={value}
				onValueChange={onValueChange}
			>
				<SelectTrigger
					data-stage-rich-select-id={selectId}
					aria-label={label}
					size="compact"
					className="pointer-events-auto h-8 shrink-0 rounded-sm text-xs"
					style={{ width, pointerEvents: "auto" }}
					onPointerDown={preserveRichSelectionPointerDown}
				>
					<span className="truncate text-left">
						{options.find((option) => option.value === value)?.label ?? label}
					</span>
				</SelectTrigger>
				<SelectContent data-stage-rich-select-id={selectId}>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</PopoverTooltip>
	);
}

function CompactFontSizeField({
	label,
	value,
	width,
	onCommit,
	resolveUnitValue,
}: {
	label: string;
	value: string;
	width: number;
	onCommit: (value: string) => void;
	resolveUnitValue: (
		nextUnit: ToolbarFontUnit,
		currentValue: string,
	) => string | null;
}) {
	const [draft, setDraft] = useState(readFontSizeDraftState(value));
	const [invalid, setInvalid] = useState(false);
	const options: ValueWithUnitOption[] = FONT_SIZE_UNIT_OPTIONS.map((option) => ({
		type: "option",
		value: option,
		label: option,
		inputMode: "numeric",
	}));
	const suggestions: ValueWithUnitSuggestion[] =
		FONT_SIZE_SUGGESTIONS_BY_UNIT[draft.unit].map((option) => ({
			value: formatDisplayValue(option),
			label: `${formatDisplayValue(option)}${draft.unit}`,
		}));

	useEffect(() => {
		setDraft(readFontSizeDraftState(value));
		setInvalid(false);
	}, [value]);

	const commitDraft = useCallback(() => {
		if (!draft.draft.trim()) {
			onCommit("");
			setInvalid(false);
			return;
		}
		try {
			const parsed = parseFontSizeValue(`${draft.draft}${draft.unit}`);
			onCommit(`${formatDisplayValue(parsed.parsed.value)}${draft.unit}`);
			setInvalid(false);
		} catch {
			setDraft(readFontSizeDraftState(value));
			setInvalid(false);
		}
	}, [draft, onCommit, value]);

	return (
		<PopoverTooltip
			side="top"
			align="center"
			className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
			content={<div className="leading-3.5 font-medium">{label}</div>}
		>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: toolbar field shell coordinates blur/Enter commit across shared input and unit trigger */}
			<div
				className="pointer-events-auto shrink-0"
				style={{ width, pointerEvents: "auto" }}
				onPointerDown={(event) => {
					event.stopPropagation();
				}}
				onBlur={(event: ReactFocusEvent<HTMLDivElement>) => {
					if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
						return;
					}
					commitDraft();
				}}
				onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
					if (event.defaultPrevented || event.key !== "Enter") {
						return;
					}
					if (!(event.target instanceof HTMLInputElement)) {
						return;
					}
					event.preventDefault();
					commitDraft();
					event.target.blur();
				}}
			>
				<ValueWithUnit
					mode="number-select"
					value={value || `${draft.draft || 0}${draft.unit}`}
					onChange={(nextValue) => {
						try {
							const parsed = parseFontSizeValue(nextValue);
							setDraft({
								draft: formatDisplayValue(parsed.parsed.value),
								unit: parsed.parsed.unit as ToolbarFontUnit,
								valid: true,
							});
							setInvalid(false);
							onCommit(`${formatDisplayValue(parsed.parsed.value)}${parsed.parsed.unit}`);
						} catch {
							if (FONT_SIZE_UNIT_OPTIONS.includes(nextValue as ToolbarFontUnit)) {
								setDraft((current) => ({
									...current,
									unit: nextValue as ToolbarFontUnit,
								}));
							}
						}
					}}
					options={options}
					inputValue={draft.draft}
					selectedOption={draft.unit}
					placeholder="18"
					min={0}
					step="any"
					ariaLabel={label}
					invalid={invalid}
					segmentWidth={36}
					suggestions={suggestions}
					onInputBlur={commitDraft}
					onInputValueChange={(nextDraft) => {
						setDraft((current) => ({ ...current, draft: nextDraft }));
						if (!nextDraft.trim()) {
							setInvalid(false);
							return;
						}
						try {
							parseFontSizeValue(`${nextDraft}${draft.unit}`);
							setInvalid(false);
						} catch {
							setInvalid(true);
						}
					}}
					onResolveOptionValue={(nextUnit, currentValue) =>
						resolveUnitValue(nextUnit as ToolbarFontUnit, currentValue)
					}
				/>
			</div>
		</PopoverTooltip>
	);
}

function CompactIconTextField({
	label,
	icon,
	value,
	placeholder,
	width,
	onChange,
	onBlur,
	onCommit,
}: {
	label: string;
	icon: React.ReactNode;
	value: string;
	placeholder?: string;
	width: number;
	onChange: (value: string) => void;
	onBlur?: () => void;
	onCommit?: () => void;
}) {
	return (
		<PopoverTooltip
			side="top"
			align="center"
			className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
			content={<div className="leading-3.5 font-medium">{label}</div>}
		>
			<div
				className="editor-border-subtle pointer-events-auto flex h-8 shrink-0 items-center gap-1 rounded-sm border bg-transparent px-1.5"
				style={{ width, pointerEvents: "auto" }}
				onPointerDown={(event) => {
					event.stopPropagation();
				}}
			>
				<span className="editor-text-muted flex shrink-0 items-center">
					{icon}
				</span>
				<Input
					aria-label={label}
					value={value}
					placeholder={placeholder}
					className="h-full min-w-0 border-0 bg-transparent px-0 text-center text-xs shadow-none focus-visible:ring-0"
					style={{ pointerEvents: "auto" }}
					onChange={(event) => onChange(event.target.value)}
					onBlur={onBlur}
					onKeyDown={(event: ReactKeyboardEvent<HTMLInputElement>) => {
						if (event.key === "Enter") {
							event.preventDefault();
							onCommit?.();
							return;
						}
						if (event.key === "Escape") {
							event.preventDefault();
							(event.target as HTMLInputElement).blur();
						}
					}}
				/>
			</div>
		</PopoverTooltip>
	);
}

function CompactSpacingField({
	label,
	icon,
	value,
	width,
	onCommit,
	resolveUnitValue,
}: {
	label: string;
	icon: React.ReactNode;
	value: string;
	width: number;
	onCommit: (value: string) => void;
	resolveUnitValue: (
		nextUnit: ToolbarSpacingUnit,
		currentValue: string,
	) => string | null;
}) {
	const [draft, setDraft] = useState(readSpacingDraftState(value));
	const [invalid, setInvalid] = useState(false);
	const options: ValueWithUnitOption[] = BLOCK_SPACING_UNIT_OPTIONS.map(
		(option) => ({
			type: "option",
			value: option,
			label: option,
			inputMode: "numeric",
		}),
	);

	useEffect(() => {
		setDraft(readSpacingDraftState(value));
		setInvalid(false);
	}, [value]);

	const commitDraft = useCallback(() => {
		if (!draft.draft.trim()) {
			setDraft(readSpacingDraftState(value));
			setInvalid(false);
			return;
		}
		try {
			const parsed = parseSpacingValue(`${draft.draft}${draft.unit}`);
			onCommit(`${formatDisplayValue(parsed.parsed.value)}${draft.unit}`);
			setInvalid(false);
		} catch {
			setDraft(readSpacingDraftState(value));
			setInvalid(false);
		}
	}, [draft, onCommit, value]);

	return (
		<PopoverTooltip
			side="top"
			align="center"
			className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
			content={<div className="leading-3.5 font-medium">{label}</div>}
		>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: toolbar field shell coordinates blur/Enter commit across shared input and unit trigger */}
			<div
				className="pointer-events-auto flex shrink-0 items-center gap-1"
				style={{ width, pointerEvents: "auto" }}
				onPointerDown={(event) => {
					event.stopPropagation();
				}}
				onBlur={(event: ReactFocusEvent<HTMLDivElement>) => {
					if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
						return;
					}
					commitDraft();
				}}
				onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
					if (event.defaultPrevented || event.key !== "Enter") {
						return;
					}
					if (!(event.target instanceof HTMLInputElement)) {
						return;
					}
					event.preventDefault();
					commitDraft();
					event.target.blur();
				}}
			>
				<span className="editor-text-muted flex h-8 shrink-0 items-center">
					{icon}
				</span>
				<ValueWithUnit
					mode="number-select"
					value={value || `${draft.draft || 0}${draft.unit}`}
					onChange={(nextValue) => {
						try {
							const parsed = parseSpacingValue(nextValue);
							setDraft({
								draft: formatDisplayValue(parsed.parsed.value),
								unit: parsed.parsed.unit as ToolbarSpacingUnit,
								valid: true,
							});
							setInvalid(false);
							onCommit(`${formatDisplayValue(parsed.parsed.value)}${parsed.parsed.unit}`);
						} catch {
							if (
								BLOCK_SPACING_UNIT_OPTIONS.includes(
									nextValue as ToolbarSpacingUnit,
								)
							) {
								setDraft((current) => ({
									...current,
									unit: nextValue as ToolbarSpacingUnit,
								}));
							}
						}
					}}
					options={options}
					inputValue={draft.draft}
					selectedOption={draft.unit}
					placeholder="0"
					min={0}
					step="any"
					ariaLabel={label}
					invalid={invalid}
					segmentWidth={36}
					className="min-w-0 flex-1"
					onInputBlur={commitDraft}
					onInputValueChange={(nextDraft) => {
						setDraft((current) => ({ ...current, draft: nextDraft }));
						if (!nextDraft.trim()) {
							setInvalid(false);
							return;
						}
						try {
							parseSpacingValue(`${nextDraft}${draft.unit}`);
							setInvalid(false);
						} catch {
							setInvalid(true);
						}
					}}
					onResolveOptionValue={(nextUnit, currentValue) =>
						resolveUnitValue(nextUnit as ToolbarSpacingUnit, currentValue)
					}
					expandToFill
				/>
			</div>
		</PopoverTooltip>
	);
}

function CompactColorField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<PopoverTooltip
			side="top"
			align="center"
			className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
			content={<div className="leading-3.5 font-medium">{label}</div>}
		>
			<input
				aria-label={label}
				type="color"
				value={value}
				className="pointer-events-auto h-8 w-8 shrink-0 cursor-pointer rounded-sm border border-[color:var(--editor-border-subtle)] bg-transparent p-0"
				style={{ pointerEvents: "auto" }}
				onPointerDown={(event) => {
					event.stopPropagation();
				}}
				onChange={(event) => onChange(event.target.value)}
			/>
		</PopoverTooltip>
	);
}

function LinkInsertPopover({
	draft,
	placement,
	toolbarLeft,
	toolbarTop,
	toolbarWidth,
	pages,
	sectionOptions,
	targetPageSectionOptions,
	onChange,
	onCancel,
	openSelectId,
	onSelectOpenChange,
	onSubmit,
}: {
	draft: LinkPopoverDraft;
	placement: "above" | "below";
	toolbarLeft: number;
	toolbarTop: number;
	toolbarWidth: number;
	pages: NonNullable<DocumentModel["pages"]>;
	sectionOptions: ReturnType<typeof getSectionAnchorOptions>;
	targetPageSectionOptions: Array<{ id: string; name: string }>;
	onChange: (draft: LinkPopoverDraft) => void;
	onCancel: () => void;
	openSelectId: RichEditSelectId | null;
	onSelectOpenChange: (selectId: RichEditSelectId, open: boolean) => void;
	onSubmit: (event: FormEvent) => void;
}) {
	return (
		<FloatingPanelShell
			suppressPopover
			open
			data-stage-rich-link-popover="true"
			positionMode="fixed"
			style={{
				top: `${toolbarTop}px`,
				left: `${toolbarLeft + toolbarWidth}px`,
				zIndex: 230,
				transform:
					placement === "above"
						? "translate(-100%, calc(-100% - 18px))"
						: "translate(-100%, calc(100% + 18px))",
				minWidth: 320,
				pointerEvents: "auto",
			}}
			bodyClassName="space-y-2 px-3 py-3"
			bodyStyle={{ pointerEvents: "auto" }}
			onPointerDown={(event) => event.stopPropagation()}
		>
			<form className="space-y-2" onSubmit={onSubmit}>
				<CompactSelect
					selectId={RICH_SELECT_IDS.linkType}
					open={openSelectId === RICH_SELECT_IDS.linkType}
					onOpenChange={(open) =>
						onSelectOpenChange(RICH_SELECT_IDS.linkType, open)
					}
					label="Link type"
					value={draft.linkType}
					onValueChange={(value) =>
						onChange({
							...draft,
							linkType: value as LinkPopoverDraft["linkType"],
						})
					}
					options={[
						{ value: "external", label: "External" },
						{ value: "anchor", label: "Internal" },
						...(pages.length > 0 ? [{ value: "page", label: "Page" }] : []),
					]}
					width={120}
				/>
				{draft.linkType === "external" ? (
					<Input
						autoFocus
						aria-label="Link URL"
						type="url"
						placeholder="https://example.com"
						className="pointer-events-auto"
						style={{ pointerEvents: "auto" }}
						value={draft.href}
						onChange={(event) =>
							onChange({ ...draft, href: event.target.value })
						}
					/>
				) : draft.linkType === "anchor" ? (
					<Select
						open={openSelectId === RICH_SELECT_IDS.sectionTarget}
						onOpenChange={(open) =>
							onSelectOpenChange(RICH_SELECT_IDS.sectionTarget, open)
						}
						value={draft.anchorTargetId}
						onValueChange={(value) =>
							onChange({ ...draft, anchorTargetId: value })
						}
					>
						<SelectTrigger
							data-stage-rich-select-id={RICH_SELECT_IDS.sectionTarget}
							aria-label="Section target"
							className="pointer-events-auto"
							style={{ pointerEvents: "auto" }}
							onPointerDown={preserveRichSelectionPointerDown}
						>
							<span className="truncate text-left">
								{sectionOptions.find(
									(option) => option.id === draft.anchorTargetId,
								)?.name ?? "Select section"}
							</span>
						</SelectTrigger>
						<SelectContent
							data-stage-rich-select-id={RICH_SELECT_IDS.sectionTarget}
						>
							{sectionOptions.map((option) => (
								<SelectItem key={option.id} value={option.id}>
									{option.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : (
					<div className="space-y-2">
						<Select
							open={openSelectId === RICH_SELECT_IDS.targetPage}
							onOpenChange={(open) =>
								onSelectOpenChange(RICH_SELECT_IDS.targetPage, open)
							}
							value={draft.targetPageId}
							onValueChange={(value) =>
								onChange({ ...draft, targetPageId: value })
							}
						>
							<SelectTrigger
								data-stage-rich-select-id={RICH_SELECT_IDS.targetPage}
								aria-label="Target page"
								className="pointer-events-auto"
								style={{ pointerEvents: "auto" }}
								onPointerDown={preserveRichSelectionPointerDown}
							>
								<span className="truncate text-left">
									{pages.find((page) => page.id === draft.targetPageId)
										?.displayName ?? "Select page"}
								</span>
							</SelectTrigger>
							<SelectContent
								data-stage-rich-select-id={RICH_SELECT_IDS.targetPage}
							>
								{pages.map((page) => (
									<SelectItem key={page.id} value={page.id}>
										{page.displayName || page.slug || page.id}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{targetPageSectionOptions.length > 0 ? (
							<Select
								open={openSelectId === RICH_SELECT_IDS.targetPageSection}
								onOpenChange={(open) =>
									onSelectOpenChange(RICH_SELECT_IDS.targetPageSection, open)
								}
								value={draft.pageAnchorId || "__none__"}
								onValueChange={(value) =>
									onChange({
										...draft,
										pageAnchorId: value === "__none__" ? "" : value,
									})
								}
							>
								<SelectTrigger
									data-stage-rich-select-id={RICH_SELECT_IDS.targetPageSection}
									aria-label="Target page section"
									className="pointer-events-auto"
									style={{ pointerEvents: "auto" }}
									onPointerDown={preserveRichSelectionPointerDown}
								>
									<span className="truncate text-left">
										{draft.pageAnchorId
											? (targetPageSectionOptions.find(
													(option) => option.id === draft.pageAnchorId,
												)?.name ?? draft.pageAnchorId)
											: "No section jump"}
									</span>
								</SelectTrigger>
								<SelectContent
									data-stage-rich-select-id={RICH_SELECT_IDS.targetPageSection}
								>
									<SelectItem value="__none__">No section jump</SelectItem>
									{targetPageSectionOptions.map((option) => (
										<SelectItem key={option.id} value={option.id}>
											{option.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : null}
					</div>
				)}
				<div className="flex items-center justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="pointer-events-auto"
						style={{ pointerEvents: "auto" }}
						onClick={onCancel}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						size="sm"
						className="pointer-events-auto"
						style={{ pointerEvents: "auto" }}
					>
						Apply
					</Button>
				</div>
			</form>
		</FloatingPanelShell>
	);
}

function readInitialBlockSpacing(
	contentStyle: CSSProperties | undefined,
): number {
	const rowGap = contentStyle?.rowGap;
	if (typeof rowGap === "number") {
		return rowGap;
	}
	if (typeof rowGap === "string") {
		const parsed = Number.parseFloat(rowGap);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return 0;
}

function normalizeColorInputValue(color: string, fallback: string): string {
	if (/^#[0-9a-f]{6}$/i.test(color)) {
		return color;
	}
	if (/^#[0-9a-f]{3}$/i.test(color)) {
		const [, r, g, b] = color;
		return `#${r}${r}${g}${g}${b}${b}`;
	}
	return fallback;
}
