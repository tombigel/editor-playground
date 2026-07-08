import {
	type CSSProperties,
	type ClipboardEvent as ReactClipboardEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import {
	Editor,
	Element,
	Path,
	Range,
	Text,
	Transforms,
	type BaseSelection,
	type Descendant,
} from "slate";
import { Editable, ReactEditor, Slate } from "slate-react";

import { createTextDocumentContentFromClipboardHtml } from "../../api/documentApi";
import {
	BOLD_FONT_WEIGHT,
	DEFAULT_FONT_WEIGHT,
	getDocumentFontFamily,
	isBoldFontWeight,
	listDocumentFontsForPicker,
	resolveNearestSupportedFontWeight,
} from "../../api/fontApi";
import {
	convertRenderedPxToFontRelativeUnit,
	convertRenderedPxToSpacingUnit,
	formatDisplayValue,
} from "../../model/conversion";
import {
	getSectionAnchorOptions,
	isValidSectionAnchorTarget,
} from "../../model/links";
import {
	createTextDocumentContent,
	createTextDocumentFromText,
	createRichTableCell,
	createRichTableRow,
	getTextDocumentBlockGap,
	isTextBlockContent,
} from "../../model/richContent";
import type {
	DocumentModel,
	NodeId,
	RichInlineNode,
	RichTextBlock,
	RichTextLink,
	RichTextLeaf,
	RichTextBlockType,
	TextDocumentBlock,
	TextDocumentContent,
} from "../../model/types";
import {
	parseFontSizeValue,
	parseSpacingValue,
	resolveFontSizePx,
	resolveSpacingPx,
} from "../../model/units";
import {
	convertSelectionToBlockType,
	convertSelectionToCodeBlock,
	convertSelectionToList,
	createRichEditor,
	changeSelectedListItemDepth,
	fromSlateValue,
	getActiveLinkNode,
	insertListItemBreak,
	insertListSoftBreak,
	insertLink,
	insertClipboardContent,
	isSelectionInListItem,
	mergeListItemBackward,
	removeLink,
	setMarkValue,
	setSelectedBlocksDirection,
	setSelectedBlocksLineHeight,
	setSelectedBlocksTextAlign,
	setSelectedCodeBlockLanguage,
	setSelectedListMarkerStyle,
	toSlateValue,
	toggleMark,
} from "../../render/richTextEditor";
import {
	cloneSelection,
	isSelectVisibleForStructureMode,
	isTargetWithinLinkPopover,
	isTargetWithinSelectLayer,
	isTargetWithinToolbar,
	isTargetWithinValueFieldLayer,
	readInitialBlockSpacing,
	readInitialFontSizeValue,
	readToolbarFontReference,
	readToolbarState,
} from "./richTextEditOverlay/helpers";
import { LinkInsertPopover } from "./richTextEditOverlay/LinkInsertPopover";
import { renderEditElement, renderEditLeaf } from "./richTextEditOverlay/renderers";
import { RichTextToolbar } from "./richTextEditOverlay/RichTextToolbar";
import {
	DEFAULT_LINK_POPOVER,
	SYSTEM_FONT_VALUE,
	type LinkPopoverDraft,
	type RichEditSelectId,
	type RichEditValueFieldId,
	type RichToolbarState,
	type ToolbarFontUnit,
	type ToolbarSpacingUnit,
} from "./richTextEditOverlay/types";
import { useRichToolbarPosition } from "./richTextEditOverlay/useRichToolbarPosition";

type RichTextEditMode = "rich" | "block" | "list" | "table";

export function RichTextEditOverlay({
	nodeId,
	mode,
	content,
	contentStyle,
	minHeight,
	document: documentModel,
	onCommit,
	onUpdateBlockGap,
	onDiscard,
	onOpenManageFonts = () => undefined,
}: {
	nodeId: NodeId;
	mode?: RichTextEditMode;
	content: TextDocumentContent;
	contentStyle?: CSSProperties;
	minHeight?: string;
	document?: DocumentModel;
	onCommit: (
		id: NodeId,
		content: TextDocumentContent,
		options?: { clearBlockNodeLink?: boolean },
	) => void;
	onUpdateBlockGap: (id: NodeId, value: number) => void;
	onDiscard: () => void;
	onOpenManageFonts?: (options?: { category?: string }) => void;
}) {
	const editMode = mode ?? "rich";
	const editor = useMemo(() => createRichEditor(), []);
	const initialValue = useMemo(() => toSlateValue(content.blocks), [content]);
	const rootRef = useRef<HTMLDivElement | null>(null);
	const [linkPopover, setLinkPopover] =
		useState<LinkPopoverDraft>(DEFAULT_LINK_POPOVER);
	const [linkSelection, setLinkSelection] = useState<BaseSelection>(null);
	const [openSelectId, setOpenSelectId] = useState<RichEditSelectId | null>(
		null,
	);
	const [openValueFieldId, setOpenValueFieldId] =
		useState<RichEditValueFieldId | null>(null);
	const [toolbarSelection, setToolbarSelection] = useState<BaseSelection>(null);
	const [editorFocused, setEditorFocused] = useState(true);
	const [selectionRevision, setSelectionRevision] = useState(0);
	const [toolbarState, setToolbarState] = useState<RichToolbarState>(() =>
		readToolbarState(editor),
	);
	const {
		toolbarRef,
		toolbarDragging,
		toolbarPlacement,
		toolbarPosition,
		toolbarWidth,
		handleToolbarDragPointerDown,
	} = useRichToolbarPosition({ rootRef, selectionRevision });

	useEffect(() => {
		const id = requestAnimationFrame(() => {
			try {
				ReactEditor.focus(editor);
			} catch {}
		});
		return () => cancelAnimationFrame(id);
	}, [editor]);

	const commitCurrentContent = useCallback(() => {
		const nextBlocks = fromSlateValue(editor.children);
		const nextContent =
			editMode === "block"
				? createTextDocumentContent([ensureSingleTextBlock(nextBlocks)], {
						blockGap: getTextDocumentBlockGap(content),
					})
				: createTextDocumentContent(nextBlocks, {
						blockGap: getTextDocumentBlockGap(content),
					});
		onCommit(
			nodeId,
			nextContent,
		);
	}, [content, editMode, editor, nodeId, onCommit]);

	const closeOpenSelect = useCallback(() => setOpenSelectId(null), []);
	const closeOpenValueField = useCallback(() => setOpenValueFieldId(null), []);
	const closeLinkPopover = useCallback(() => {
		setOpenSelectId(null);
		setLinkSelection(null);
		setLinkPopover(DEFAULT_LINK_POPOVER);
	}, []);
	const applyAndCloseLinkPopoverRef = useRef<(() => void) | null>(null);

	const handleSelectOpenChange = useCallback(
		(selectId: RichEditSelectId, open: boolean) => {
			if (open) {
				setOpenValueFieldId(null);
			}
			setOpenSelectId((current) => {
				if (open) {
					return selectId;
				}
				return current === selectId ? null : current;
			});
		},
		[],
	);

	const handleValueFieldOpenChange = useCallback(
		(valueFieldId: RichEditValueFieldId, open: boolean) => {
			setOpenValueFieldId(open ? valueFieldId : null);
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
			if (openValueFieldId) {
				if (isTargetWithinValueFieldLayer(target, openValueFieldId)) {
					return;
				}
				event.preventDefault();
				event.stopPropagation();
				closeOpenValueField();
				return;
			}
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
				applyAndCloseLinkPopoverRef.current?.();
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
		closeOpenValueField,
		closeOpenSelect,
		commitCurrentContent,
		linkPopover.open,
		openSelectId,
		openValueFieldId,
	]);

	useEffect(() => {
		function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
			if (event.key !== "Escape") {
				return;
			}

			if (openValueFieldId) {
				event.preventDefault();
				event.stopPropagation();
				closeOpenValueField();
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
				applyAndCloseLinkPopoverRef.current?.();
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
		closeOpenValueField,
		closeOpenSelect,
		linkPopover.open,
		onDiscard,
		openSelectId,
		openValueFieldId,
	]);

	const documentFonts = useMemo(
		() => (documentModel ? listDocumentFontsForPicker(documentModel) : []),
		[documentModel],
	);
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

	const resolvedToolbarFontSizeValue =
		toolbarState.currentFontSize ||
		readInitialFontSizeValue(contentStyle) ||
		`${formatDisplayValue(readToolbarFontReference(rootRef.current).inheritedFontSizePx)}px`;
	const currentBlockGap =
		getTextDocumentBlockGap(content) ?? readInitialBlockSpacing(contentStyle);
	const currentBlockSpacingValue = `${String(currentBlockGap)}px`;

	useEffect(() => {
		if (
			openSelectId &&
			!isSelectVisibleForStructureMode(openSelectId, toolbarState.structureMode)
		) {
			setOpenSelectId(null);
		}
	}, [openSelectId, toolbarState.structureMode]);

	const syncToolbarState = useCallback(() => {
		setToolbarState(readToolbarState(editor));
	}, [editor]);

	const openLinkPopover = useCallback(() => {
		const currentSelection = cloneSelection(editor.selection);
		setLinkSelection(currentSelection);
		const existingLink = getActiveLinkNode(editor);
		if (existingLink) {
			setLinkPopover({
				open: true,
				linkType: existingLink.linkType,
				href: existingLink.href ?? "",
				targetPageId: existingLink.targetPageId ?? pages[0]?.id ?? "",
				pageAnchorId: existingLink.pageAnchorId ?? "",
				anchorTargetId: existingLink.anchorTargetId ?? sectionOptions[0]?.id ?? "",
			});
			return;
		}
		setLinkPopover({
			...DEFAULT_LINK_POPOVER,
			open: true,
			anchorTargetId: sectionOptions[0]?.id ?? "",
			href: "",
			targetPageId: pages[0]?.id ?? "",
		});
	}, [editor, pages, sectionOptions]);

		const getSelectedTableCellEntry = useCallback((editorInstance: Editor) => {
			if (!editorInstance.selection) {
				return null;
			}
			return Editor.above(editorInstance, {
				match: (node) =>
					Element.isElement(node) &&
					(node as { type?: string }).type === "table-cell",
			});
		}, []);

		const preventTableStructureBackspace = useCallback((editorInstance: Editor): boolean => {
			if (!editorInstance.selection || !Range.isCollapsed(editorInstance.selection)) {
				return false;
			}
			const cellEntry = getSelectedTableCellEntry(editorInstance);
			return Boolean(cellEntry && Editor.isStart(editorInstance, editorInstance.selection.anchor, cellEntry[1]));
		}, [getSelectedTableCellEntry]);

		const moveTableSelection = useCallback((editorInstance: Editor, backwards: boolean): boolean => {
			const cellEntry = getSelectedTableCellEntry(editorInstance);
			if (!cellEntry) {
				return false;
		}
		const tableEntry = Editor.above(editorInstance, {
			at: cellEntry[1],
			match: (node) =>
				Element.isElement(node) &&
				(node as { type?: string }).type === "table",
		});
		if (!tableEntry) {
			return false;
		}

		const cells = Array.from(Editor.nodes(editorInstance, {
			at: tableEntry[1],
			match: (node) =>
				Element.isElement(node) &&
				(node as { type?: string }).type === "table-cell",
		}));
		const currentIndex = cells.findIndex(([, path]) => Path.equals(path, cellEntry[1]));
		if (currentIndex === -1) {
			return false;
		}

		const nextCell = cells[currentIndex + (backwards ? -1 : 1)];
		if (nextCell) {
			Transforms.select(editorInstance, Editor.start(editorInstance, nextCell[1]));
			return true;
		}
		if (backwards) {
			return true;
		}

		const rowEntries = Array.from(Editor.nodes(editorInstance, {
			at: tableEntry[1],
			match: (node) =>
				Element.isElement(node) &&
				(node as { type?: string }).type === "table-row",
		}));
		const lastRowPath = rowEntries[rowEntries.length - 1]?.[1];
		if (!lastRowPath) {
			return false;
		}
		const columnCount = Math.max(1, Math.round(cells.length / Math.max(1, rowEntries.length)));
		const nextRowPath = Path.next(lastRowPath);
		Transforms.insertNodes(
			editorInstance,
			createRichTableRow(
				Array.from({ length: columnCount }, () => createRichTableCell()),
			) as unknown as Descendant,
			{ at: nextRowPath },
			);
			Transforms.select(editorInstance, Editor.start(editorInstance, [...nextRowPath, 0]));
			return true;
		}, [getSelectedTableCellEntry]);

	const handleKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLDivElement>) => {
			if (event.key === "Escape") {
				return;
			}

			const isMod = event.metaKey || event.ctrlKey;
			const refreshKeyboardEdit = () => {
				syncToolbarState();
				setSelectionRevision((revision) => revision + 1);
			};
			if (isMod && event.key === "Enter") {
				event.preventDefault();
				commitCurrentContent();
				return;
			}
			if (editMode === "block" && event.key === "Enter") {
				event.preventDefault();
				Editor.insertText(editor, "\n");
				syncToolbarState();
				setSelectionRevision((revision) => revision + 1);
				return;
			}
			if (event.key === "Enter" && isSelectionInListItem(editor)) {
				event.preventDefault();
				if (event.shiftKey) {
					insertListSoftBreak(editor);
				} else {
					insertListItemBreak(editor);
				}
				refreshKeyboardEdit();
				return;
			}
			if (
				editMode === "table" &&
				event.key === "Backspace" &&
				preventTableStructureBackspace(editor)
			) {
				event.preventDefault();
				return;
			}
			if (event.key === "Backspace" && mergeListItemBackward(editor)) {
				event.preventDefault();
				refreshKeyboardEdit();
				return;
			}
			if (event.key === "Tab") {
				event.preventDefault();
				if (editMode === "table" && moveTableSelection(editor, event.shiftKey)) {
					refreshKeyboardEdit();
					return;
				}
				if (!changeSelectedListItemDepth(editor, event.shiftKey ? -1 : 1) && !event.shiftKey) {
					Editor.insertText(editor, "\t");
				}
				refreshKeyboardEdit();
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
				openLinkPopover();
			}
		},
			[commitCurrentContent, editMode, editor, moveTableSelection, openLinkPopover, preventTableStructureBackspace, syncToolbarState],
		);

	const handlePaste = useCallback(
		(event: ReactClipboardEvent<HTMLDivElement>) => {
			const html = event.clipboardData.getData("text/html");
			const text = event.clipboardData.getData("text/plain");
			if (!html && !text) {
				return;
			}
			event.preventDefault();
			if (editMode === "table") {
				Editor.insertText(editor, text || html.replace(/<[^>]+>/g, ""));
				syncToolbarState();
				setSelectionRevision((revision) => revision + 1);
				return;
			}
			const content = html && documentModel
				? createTextDocumentContentFromClipboardHtml(documentModel, { html, text })
				: createTextDocumentFromText(text);
			insertClipboardContent(editor, content, editMode);
			syncToolbarState();
			setSelectionRevision((revision) => revision + 1);
		},
		[documentModel, editMode, editor, syncToolbarState],
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

	const refreshAfterEdit = useCallback(() => {
		syncToolbarState();
		setSelectionRevision((revision) => revision + 1);
	}, [syncToolbarState]);

	const focusEditorSoon = useCallback(() => {
		requestAnimationFrame(() => {
			try {
				ReactEditor.focus(editor);
			} catch {}
		});
	}, [editor]);

	const handleBooleanMark = useCallback(
		(mark: "bold" | "italic" | "underline" | "strikethrough") => {
			restoreToolbarSelection();
			if (mark === "bold") {
				const selectedFamily =
					documentModel && toolbarState.currentFontFamily !== SYSTEM_FONT_VALUE
						? getDocumentFontFamily(documentModel, toolbarState.currentFontFamily)
						: undefined;
				const nextFontWeight = resolveNearestSupportedFontWeight(
					isBoldFontWeight(toolbarState.currentFontWeight)
						? DEFAULT_FONT_WEIGHT
						: BOLD_FONT_WEIGHT,
					selectedFamily,
				);
				setMarkValue(editor, "fontWeight", String(nextFontWeight));
				Transforms.unsetNodes(editor, "bold", {
					match: Text.isText,
					split: true,
				});
				refreshAfterEdit();
				focusEditorSoon();
				return;
			}
			toggleMark(editor, mark);
			refreshAfterEdit();
			focusEditorSoon();
		},
		[documentModel, editor, focusEditorSoon, refreshAfterEdit, restoreToolbarSelection, toolbarState],
	);

	const handleValueMark = useCallback(
		(
			mark: "color" | "backgroundColor" | "fontFamily" | "fontSize" | "fontWeight",
			value: string,
		) => {
			restoreToolbarSelection();
			if (mark === "fontWeight") {
				setMarkValue(editor, mark, value);
				Transforms.unsetNodes(editor, "bold", {
					match: Text.isText,
					split: true,
				});
			} else {
				setMarkValue(
					editor,
					mark,
					mark === "fontFamily" && value === SYSTEM_FONT_VALUE ? "" : value,
				);
			}
			refreshAfterEdit();
		},
		[editor, refreshAfterEdit, restoreToolbarSelection],
	);

	const mutateSelectedBlocks = useCallback(
		(operation: () => void) => {
			restoreToolbarSelection();
			operation();
			refreshAfterEdit();
		},
		[refreshAfterEdit, restoreToolbarSelection],
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

	const applyLinkFromPopover = useCallback(() => {
		if (linkPopover.linkType === "external" && !linkPopover.href.trim()) {
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
		refreshAfterEdit();
	}, [documentModel, editor, linkPopover, refreshAfterEdit, restoreToolbarSelection, sectionOptions]);

	const applyAndCloseLinkPopover = useCallback(() => {
		applyLinkFromPopover();
		closeLinkPopover();
	}, [applyLinkFromPopover, closeLinkPopover]);
	applyAndCloseLinkPopoverRef.current = applyAndCloseLinkPopover;

	const handleRemoveLinkFromPopover = useCallback(() => {
		restoreToolbarSelection();
		removeLink(editor);
		closeLinkPopover();
		refreshAfterEdit();
	}, [closeLinkPopover, editor, refreshAfterEdit, restoreToolbarSelection]);

	const toolbarChrome = (
		<>
			<RichTextToolbar
				mode={editMode}
				toolbarRef={toolbarRef}
				toolbarPosition={toolbarPosition}
				toolbarDragging={toolbarDragging}
				onToolbarDragPointerDown={handleToolbarDragPointerDown}
				documentFonts={documentFonts}
				currentFontFamily={toolbarState.currentFontFamily}
				currentFontWeight={toolbarState.currentFontWeight}
				onOpenManageFonts={onOpenManageFonts}
				resolvedToolbarFontSizeValue={resolvedToolbarFontSizeValue}
				openValueFieldId={openValueFieldId}
				onValueFieldOpenChange={handleValueFieldOpenChange}
				resolveFontSizeUnitValue={(nextUnit: ToolbarFontUnit, currentValue) => {
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
				onValueMark={handleValueMark}
				onBooleanMark={handleBooleanMark}
				toolbarState={{
					...toolbarState,
					linkActive: toolbarState.linkActive || linkPopover.open,
				}}
				openSelectId={openSelectId}
				onSelectOpenChange={handleSelectOpenChange}
				onLinkAction={openLinkPopover}
				onUseTextBlock={() =>
					mutateSelectedBlocks(() =>
						convertSelectionToBlockType(editor, toolbarState.selectedBlockType),
					)
				}
				onBlockTypeChange={(value: RichTextBlockType) =>
					mutateSelectedBlocks(() => convertSelectionToBlockType(editor, value))
				}
				onUseCodeBlock={() =>
					mutateSelectedBlocks(() =>
						convertSelectionToCodeBlock(
							editor,
							toolbarState.selectedCodeLanguage || "plaintext",
						),
					)
				}
				onCodeLanguageChange={(value) =>
					mutateSelectedBlocks(() => setSelectedCodeBlockLanguage(editor, value))
				}
				onUseOrderedList={() =>
					mutateSelectedBlocks(() => convertSelectionToList(editor, "ol"))
				}
				onOrderedMarkerChange={(value) =>
					mutateSelectedBlocks(() => setSelectedListMarkerStyle(editor, value))
				}
				onUseUnorderedList={() =>
					mutateSelectedBlocks(() => convertSelectionToList(editor, "ul"))
				}
				onUnorderedMarkerChange={(value) =>
					mutateSelectedBlocks(() => setSelectedListMarkerStyle(editor, value))
				}
				onTextAlignChange={(value) =>
					mutateSelectedBlocks(() => setSelectedBlocksTextAlign(editor, value))
				}
				onDirectionToggle={() =>
					mutateSelectedBlocks(() =>
						setSelectedBlocksDirection(
							editor,
							toolbarState.selectedDirection === "rtl" ? "ltr" : "rtl",
						),
					)
				}
				onLineHeightChange={(value) => {
					if (!Number.isFinite(value) || value <= 0) {
						return;
					}
					mutateSelectedBlocks(() => setSelectedBlocksLineHeight(editor, value));
				}}
				currentBlockSpacingValue={currentBlockSpacingValue}
				onBlockSpacingCommit={handleBlockSpacingCommit}
				resolveSpacingUnitValue={(
					nextUnit: ToolbarSpacingUnit,
					currentValue,
				) => {
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
					onRemove={handleRemoveLinkFromPopover}
					openSelectId={openSelectId}
					onSelectOpenChange={handleSelectOpenChange}
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
						onPaste={handlePaste}
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
							display: "grid",
							alignContent: "start",
							rowGap: `${currentBlockGap}px`,
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

function ensureSingleTextBlock(blocks: TextDocumentBlock[]): RichTextBlock {
	const firstTextBlock = blocks.find(isTextBlockContent);
	const children = blocks.flatMap((block, index) => [
		...(index === 0 ? [] : [{ text: "\n" } satisfies RichTextLeaf]),
		...textDocumentBlockToInlineChildren(block),
	]);

	return {
		type: firstTextBlock?.type ?? "paragraph",
		...(firstTextBlock?.direction ? { direction: firstTextBlock.direction } : {}),
		...(firstTextBlock?.lineHeight
			? { lineHeight: firstTextBlock.lineHeight }
			: {}),
		...(firstTextBlock?.style ? { style: firstTextBlock.style } : {}),
		children: children.length > 0 ? children : [{ text: "" }],
	};
}

function textDocumentBlockToInlineChildren(
	block: TextDocumentBlock,
): RichInlineNode[] {
	if (isTextBlockContent(block)) {
		return block.children.map(cloneInlineNode);
	}

	if (block.type === "code-block") {
		return block.children.flatMap((line, lineIndex) => [
			...(lineIndex === 0 ? [] : [{ text: "\n" } satisfies RichTextLeaf]),
			...line.children.map(cloneTextLeaf),
		]);
	}

	if (block.type === "table") {
		return block.children.flatMap((row, rowIndex) => [
			...(rowIndex === 0 ? [] : [{ text: "\n" } satisfies RichTextLeaf]),
			...row.children.flatMap((cell, cellIndex) => [
				...(cellIndex === 0 ? [] : [{ text: "\t" } satisfies RichTextLeaf]),
				...cell.children.map(cloneInlineNode),
			]),
		]);
	}

	return block.children.flatMap((item, itemIndex) => [
		...(itemIndex === 0 ? [] : [{ text: "\n" } satisfies RichTextLeaf]),
		...item.children.map(cloneInlineNode),
	]);
}

function cloneInlineNode(node: RichInlineNode): RichInlineNode {
	if (isInlineLink(node)) {
		return {
			...node,
			children: node.children.map(cloneTextLeaf),
		};
	}
	return cloneTextLeaf(node);
}

function cloneTextLeaf(leaf: RichTextLeaf): RichTextLeaf {
	return { ...leaf };
}

function isInlineLink(node: RichInlineNode): node is RichTextLink {
	return (node as { type?: string }).type === "link";
}
