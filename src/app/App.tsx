import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
	createBlankInitialDocument,
	createInitialDocument,
	createNodeClipboardJson,
	EDITOR_NODE_CLIPBOARD_MIME,
	parseNodeClipboardPayloadDoc,
	serializeNodesForClipboardDoc,
	type EditorNodeClipboardPayload,
	type StickyGeometrySnapshot,
} from "../api/editorApi";
import { isTextNode } from "../api/documentViewApi";
import {
	BOLD_FONT_WEIGHT,
	DEFAULT_FONT_WEIGHT,
	getDocumentDefaultFontFamily,
	getDocumentFontFamily,
	isBoldFontWeight,
	resolveNearestSupportedFontWeight,
} from "../api/fontApi";
import { getShortcutPlatform } from "@/lib/shortcuts";
import type { ThemeMode } from "@/lib/theme";
import { AppShell } from "./AppShell";
import type { AppMode, AppStartupAction } from "./appRouting";
import {
	importSettingsDocument,
	resetEditorData,
	resetEditorState,
	toActionResult,
} from "./appSettingsActions";
import { createHistoryState, historyReducer } from "./editorState";
import type { BulkEditOperation } from "./types";
import { useAppPanels } from "./useAppPanels";
import { useAppRuntime } from "./useAppRuntime";
import { useAppViewModel } from "./useAppViewModel";
import { useEditorKeyboardShortcuts } from "./useEditorKeyboardShortcuts";
import { getShortcutFocusContext } from "./useEditorEnvironment";
import { openPreviewSiteWindow } from "./previewWindow";
import type { ShortcutExecutionHandlers } from "./types";

type AppProps = {
	mode?: Extract<AppMode, "edit" | "preview">;
	routeSearchParams?: URLSearchParams;
	startupAction?: AppStartupAction | null;
	startupThemeMode?: ThemeMode | null;
	onStartupActionHandled?: (id: number) => void;
	onStartupThemeModeHandled?: () => void;
};

export function App({
	mode = "edit",
	routeSearchParams,
	startupAction = null,
	startupThemeMode = null,
	onStartupActionHandled = () => undefined,
	onStartupThemeModeHandled = () => undefined,
}: AppProps) {
	const [historyState, dispatch] = useReducer(
		historyReducer,
		undefined,
		createHistoryState,
	);
	const handledStartupActionIdRef = useRef<number | null>(null);
	const nodeClipboardRef = useRef<EditorNodeClipboardPayload | null>(null);
	const state = historyState.present;
	const [stickyGeometry, setStickyGeometry] = useState<StickyGeometrySnapshot>(
		{},
	);
	const panels = useAppPanels();
	const shortcutPlatform = getShortcutPlatform();
	const viewModel = useAppViewModel(state, stickyGeometry);

	function collectSelectionRects() {
		if (typeof window === "undefined") {
			return {};
		}

		return Object.fromEntries(
			state.selectedIds.flatMap((nodeId) => {
				const element = window.document.getElementById(`stage-node-${nodeId}`);
				if (!element) {
					return [];
				}
				const rect = element.getBoundingClientRect();
				return [
					[
						nodeId,
						{
							left: rect.left,
							top: rect.top,
							width: rect.width,
							height: rect.height,
						},
					],
				];
			}),
		);
	}

	function getSelectedTypographyNodes() {
		return viewModel.selectedNodes.filter(
			(
				node,
			): node is Extract<
				(typeof viewModel.selectedNodes)[number],
				{ contentType: "text" }
			> =>
				isTextNode(node),
		);
	}

	function dispatchSelectedTextEdit(
		field: "fontWeight" | "fontStyle" | "textDecorationLine",
		resolveValue: (
			nodes: ReturnType<typeof getSelectedTypographyNodes>,
		) => string,
	) {
		const nodes = getSelectedTypographyNodes();
		if (nodes.length === 0) {
			return;
		}
		const operations: BulkEditOperation[] = [
			{
				kind: "text",
				targetIds: nodes.map((node) => node.id),
				field,
				value: resolveValue(nodes),
			},
		];
		dispatch({ type: "bulkEdit", operations });
	}

	function dispatchBoldToggleSelection() {
		const nodes = getSelectedTypographyNodes();
		if (nodes.length === 0) {
			return;
		}

		const disableBold = nodes.every((node) =>
			isBoldFontWeight(node.style?.fontWeight),
		);
		const targetWeight = disableBold ? DEFAULT_FONT_WEIGHT : BOLD_FONT_WEIGHT;
		const operations: BulkEditOperation[] = nodes.map((node) => ({
			kind: "text",
			targetIds: [node.id],
			field: "fontWeight",
			value: String(
				resolveNearestSupportedFontWeight(
					targetWeight,
					node.style?.fontFamily
						? getDocumentFontFamily(state.document, node.style.fontFamily)
						: getDocumentDefaultFontFamily(state.document),
				),
			),
		}));

		dispatch({ type: "bulkEdit", operations });
	}

  function toggleTextDecoration(
    value: string,
    target: "underline" | "line-through",
	) {
		const hasUnderline = value.includes("underline");
		const hasLineThrough = value.includes("line-through");
		const nextUnderline = target === "underline" ? !hasUnderline : hasUnderline;
		const nextLineThrough =
			target === "line-through" ? !hasLineThrough : hasLineThrough;
		if (nextUnderline && nextLineThrough) {
			return "underline line-through";
		}
		if (nextUnderline) {
			return "underline";
		}
		if (nextLineThrough) {
			return "line-through";
		}
		return "none";
  }

  useAppRuntime(state, viewModel.resolvedTheme, dispatch);

	const getSelectedClipboardPayload = useCallback(() => {
		return serializeNodesForClipboardDoc(state.document, state.selectedIds);
	}, [state.document, state.selectedIds]);

	const writeNodePayloadToSystemClipboard = useCallback(async (payload: EditorNodeClipboardPayload) => {
		const json = createNodeClipboardJson(payload);
		const clipboard = navigator.clipboard as Clipboard & {
			write?: (items: ClipboardItem[]) => Promise<void>;
		};
		if (clipboard?.write && typeof ClipboardItem !== "undefined") {
			try {
				await clipboard.write([
					new ClipboardItem({
						[EDITOR_NODE_CLIPBOARD_MIME]: new Blob([json], {
							type: EDITOR_NODE_CLIPBOARD_MIME,
						}),
						"text/plain": new Blob([json], { type: "text/plain" }),
					}),
				]);
				return;
			} catch {
				// Fall through to writeText for browsers that block custom MIME writes.
			}
		}
		await navigator.clipboard?.writeText(json);
	}, []);

	const copySelectionToEventClipboard = useCallback((event: ClipboardEvent) => {
		const payload = getSelectedClipboardPayload();
		if (!payload || !event.clipboardData) {
			return false;
		}
		const json = createNodeClipboardJson(payload);
		nodeClipboardRef.current = payload;
		event.clipboardData.setData(EDITOR_NODE_CLIPBOARD_MIME, json);
		event.clipboardData.setData("text/plain", json);
		event.preventDefault();
		return true;
	}, [getSelectedClipboardPayload]);

	const copySelectionToClipboard = useCallback(async () => {
		const payload = getSelectedClipboardPayload();
		if (!payload) {
			return;
		}
		nodeClipboardRef.current = payload;
		try {
			await writeNodePayloadToSystemClipboard(payload);
		} catch {
			// The in-memory stack still enables paste in this app session.
		}
	}, [getSelectedClipboardPayload, writeNodePayloadToSystemClipboard]);

	const pasteClipboardPayload = useCallback((payload: EditorNodeClipboardPayload) => {
		dispatch({ type: "pasteClipboardNodes", payload });
	}, []);

	const pasteExternalClipboardData = useCallback((data: { text?: string; html?: string }) => {
		if (!data.text && !data.html) {
			return;
		}
		dispatch({ type: "pasteExternalClipboard", data });
	}, []);

	const pasteFromEventClipboard = useCallback((event: ClipboardEvent) => {
		if (nodeClipboardRef.current) {
			event.preventDefault();
			pasteClipboardPayload(nodeClipboardRef.current);
			return true;
		}
		const customPayload = event.clipboardData
			? parseNodeClipboardPayloadDoc(
					event.clipboardData.getData(EDITOR_NODE_CLIPBOARD_MIME),
				)
			: null;
		if (customPayload) {
			nodeClipboardRef.current = customPayload;
			event.preventDefault();
			pasteClipboardPayload(customPayload);
			return true;
		}
		const text = event.clipboardData?.getData("text/plain") ?? "";
		const html = event.clipboardData?.getData("text/html") ?? "";
		if (text || html) {
			event.preventDefault();
			pasteExternalClipboardData({ text, html });
			return true;
		}
		return false;
	}, [pasteClipboardPayload, pasteExternalClipboardData]);

	const readNodePayloadFromSystemClipboard = useCallback(async () => {
		const clipboard = navigator.clipboard as Clipboard & {
			read?: () => Promise<ClipboardItem[]>;
		};
		if (clipboard?.read) {
			try {
				const items = await clipboard.read();
				for (const item of items) {
					if (item.types.includes(EDITOR_NODE_CLIPBOARD_MIME)) {
						const blob = await item.getType(EDITOR_NODE_CLIPBOARD_MIME);
						const payload = parseNodeClipboardPayloadDoc(await blob.text());
						if (payload) {
							return payload;
						}
					}
				}
			} catch {
				// readText fallback below handles browsers without async custom MIME access.
			}
		}
		try {
			const text = await navigator.clipboard?.readText();
			return text ? parseNodeClipboardPayloadDoc(text) : null;
		} catch {
			return null;
		}
	}, []);

	const pasteClipboard = useCallback(async () => {
		if (nodeClipboardRef.current) {
			pasteClipboardPayload(nodeClipboardRef.current);
			return;
		}
		const payload = await readNodePayloadFromSystemClipboard();
		if (payload) {
			nodeClipboardRef.current = payload;
			pasteClipboardPayload(payload);
			return;
		}
		try {
			const text = await navigator.clipboard?.readText();
			pasteExternalClipboardData({ text });
		} catch {
			// Clipboard permission denial leaves paste as a no-op.
		}
	}, [pasteClipboardPayload, pasteExternalClipboardData, readNodePayloadFromSystemClipboard]);

	const duplicateSelection = useCallback(() => {
		dispatch({ type: "duplicateSelection" });
	}, []);

	useEffect(() => {
		function shouldUseEditorClipboard() {
			const activeElement = window.document.activeElement as HTMLElement | null;
			return !getShortcutFocusContext(activeElement).textInputFocus;
		}

		function handleCopy(event: ClipboardEvent) {
			if (state.selectedIds.length === 0 || !shouldUseEditorClipboard()) {
				return;
			}
			copySelectionToEventClipboard(event);
		}

		function handlePaste(event: ClipboardEvent) {
			if (!shouldUseEditorClipboard()) {
				return;
			}
			pasteFromEventClipboard(event);
		}

		window.addEventListener("copy", handleCopy);
		window.addEventListener("paste", handlePaste);
		return () => {
			window.removeEventListener("copy", handleCopy);
			window.removeEventListener("paste", handlePaste);
		};
	}, [copySelectionToEventClipboard, pasteFromEventClipboard, state.selectedIds.length]);

	useEffect(() => {
		if (
			!startupAction ||
			handledStartupActionIdRef.current === startupAction.id
		) {
			return;
		}
		if (startupAction.type === "startBlank") {
			dispatch({
				type: "importDocument",
				document: createBlankInitialDocument(),
			});
			handledStartupActionIdRef.current = startupAction.id;
			onStartupActionHandled(startupAction.id);
		}
		if (startupAction.type === "startTour") {
			dispatch({
				type: "importDocument",
				document: createInitialDocument(),
			});
			handledStartupActionIdRef.current = startupAction.id;
			onStartupActionHandled(startupAction.id);
		}
	}, [onStartupActionHandled, startupAction]);

	useEffect(() => {
		if (!startupThemeMode) {
			return;
		}
		dispatch({ type: "setThemeMode", value: startupThemeMode });
		onStartupThemeModeHandled();
	}, [onStartupThemeModeHandled, startupThemeMode]);

  const shortcutHandlers: ShortcutExecutionHandlers = {
    app: {
      openDocumentation: () => panels.setHelpOpen(true),
      openPreviewSite: () => openPreviewSiteWindow(),
    },
    history: {
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
    },
    panels: {
      closePanels: () => {
        panels.closeTransientPanels();
        dispatch({ type: "setTemporaryInspectorOpen", value: false });
      },
      toggleSettings: () => panels.setSettingsOpen((open) => !open),
      openShortcuts: () => panels.setShortcutsOpen(true),
      toggleFontsPanel: () => panels.toggleManageFontsPanel(),
      toggleComponentsPanel: () => panels.toggleLayersPanel(),
      togglePagesPanel: () => panels.togglePagesPanel(),
    },
    viewState: {
      setShowHidden: (value) => dispatch({ type: "setShowHidden", value }),
      setPreviewSticky: (value) => dispatch({ type: "setPreviewSticky", value }),
      setAnimationPreview: (value) =>
        dispatch({ type: "setAnimationPreview", value }),
      setSpacerVisibility: (value) =>
        dispatch({ type: "setSpacerVisibility", value }),
      setSnapSettings: (value) => dispatch({ type: "setSnapSettings", value }),
      setShowGridLanes: (value) => dispatch({ type: "setShowGridLanes", value }),
      setShowDebugInfo: (value) => dispatch({ type: "setShowDebugInfo", value }),
    },
    selection: {
      nudgeSelection: (deltaX, deltaY) =>
        dispatch({
          type: "nudgeSelection",
          deltaX,
          deltaY,
        }),
      deleteSelection: () => dispatch({ type: "delete" }),
      copySelection: () => {
        void copySelectionToClipboard();
      },
      pasteClipboard: () => {
        void pasteClipboard();
      },
      duplicateSelection,
      toggleBoldSelection: () => dispatchBoldToggleSelection(),
      toggleItalicSelection: () =>
        dispatchSelectedTextEdit("fontStyle", (nodes) =>
          nodes.every((node) => (node.style?.fontStyle ?? "normal") === "italic")
            ? "normal"
            : "italic",
        ),
      toggleUnderlineSelection: () =>
        dispatchSelectedTextEdit("textDecorationLine", (nodes) => {
          const shared =
            nodes
              .map((node) => node.style?.textDecorationLine ?? "none")
              .reduce<string | null>(
                (current, value) => (current == null || current === value ? value : ""),
                null,
              ) ?? "none";
          return toggleTextDecoration(shared, "underline");
        }),
      toggleStrikethroughSelection: () =>
        dispatchSelectedTextEdit("textDecorationLine", (nodes) => {
          const shared =
            nodes
              .map((node) => node.style?.textDecorationLine ?? "none")
              .reduce<string | null>(
                (current, value) => (current == null || current === value ? value : ""),
                null,
              ) ?? "none";
          return toggleTextDecoration(shared, "line-through");
        }),
      alignSelection: (mode) =>
        dispatch({
          type: "alignSelection",
          mode,
          rects: collectSelectionRects(),
        }),
      distributeSelection: (mode) =>
        dispatch({
          type: "distributeSelection",
          mode,
          rects: collectSelectionRects(),
        }),
      orderBack: () => dispatch({ type: "orderBack" }),
      orderForward: () => dispatch({ type: "orderForward" }),
      orderSendToBack: () => dispatch({ type: "orderSendToBack" }),
      orderBringToFront: () => dispatch({ type: "orderBringToFront" }),
    },
  };

  useEditorKeyboardShortcuts({
    document: state.document,
    activePageId: state.activePageId,
		selectedId: state.selectedId,
		selectedIds: state.selectedIds,
    ui: {
      showHidden: state.ui.showHidden,
      previewSticky: state.ui.previewSticky,
      animationPreview: state.ui.animationPreview,
      spacerVisibility: state.ui.spacerVisibility,
      snapSettings: state.ui.snapSettings,
      showGridLanes: state.ui.showGridLanes,
      showDebugInfo: state.ui.showDebugInfo,
    },
    hasDismissiblePanels:
      panels.hasDismissiblePanels || state.ui.temporaryInspectorOpen,
    shortcutPlatform,
    handlers: shortcutHandlers,
    onSelect: (id) => dispatch({ type: "select", id }),
  });

	async function handleImportDocument(raw: string) {
		const result = importSettingsDocument(raw);
		if (result.ok) {
			dispatch({ type: "importDocument", document: result.document });
		}
		return toActionResult(result);
	}

	function handleResetData() {
		resetEditorData(state.ui);
		dispatch({ type: "resetData" });
	}

	function handleResetAll() {
		resetEditorState();
		dispatch({ type: "resetAll" });
	}

	return (
		<AppShell
			state={state}
			historyState={historyState}
			selectedNode={viewModel.selectedNode}
			selectedNodes={viewModel.selectedNodes}
			orderState={viewModel.orderState}
			sectionOrderState={viewModel.sectionOrderState}
			resolvedTheme={viewModel.resolvedTheme}
			shortcutPlatform={shortcutPlatform}
			topbarClass={viewModel.topbarClass}
			stageSelectableIds={viewModel.stageSelectableIds}
			settingsOpen={panels.settingsOpen}
			manageFontsOpen={panels.manageFontsOpen}
			helpOpen={panels.helpOpen}
			shortcutsOpen={panels.shortcutsOpen}
			aboutOpen={panels.aboutOpen}
			layersOpen={panels.layersOpen}
			pagesOpen={panels.pagesOpen}
			layersPosition={panels.layersPosition}
			pagesPosition={panels.pagesPosition}
			layersPanelRef={panels.layersPanelRef}
			pagesPanelRef={panels.pagesPanelRef}
			sectionTemplateOpen={panels.sectionTemplateOpen}
			textTypeOpen={panels.textTypeOpen}
			settingsPanelRef={panels.settingsPanelRef}
			sectionTemplatePanelRef={panels.sectionTemplatePanelRef}
			textTypePanelRef={panels.textTypePanelRef}
			documentJson={viewModel.documentJson}
			dispatch={dispatch}
			onStickyGeometryChange={setStickyGeometry}
			onOpenLayers={panels.openLayers}
			onOpenPages={panels.openPages}
			onLayersOpenChange={panels.handleLayersOpenChange}
			onLayersPositionChange={panels.handleLayersPositionChange}
			onPagesPositionChange={panels.handlePagesPositionChange}
			onCloseLayers={panels.closeLayersPanel}
			onOpenSectionTemplates={panels.openSectionTemplates}
			onSectionTemplateOpenChange={panels.handleSectionTemplateOpenChange}
			onCloseSectionTemplates={panels.closeSectionTemplatePopover}
			onOpenTextTypes={panels.openTextTypePopover}
			onTextTypeOpenChange={panels.handleTextTypeOpenChange}
			onCloseTextTypes={panels.closeTextTypePopover}
			onInsertTextType={(role) => dispatch({ type: "insertLeaf", role })}
			onSettingsOpenChange={panels.setSettingsOpen}
			onManageFontsOpenChange={panels.setManageFontsOpen}
			onHelpOpenChange={panels.setHelpOpen}
			onShortcutsOpenChange={panels.setShortcutsOpen}
			onAboutOpenChange={panels.setAboutOpen}
			onPagesOpenChange={panels.setPagesOpen}
			onImportDocument={handleImportDocument}
			onResetData={handleResetData}
			onResetAll={handleResetAll}
			onCopySelection={copySelectionToClipboard}
			onPasteClipboard={pasteClipboard}
			onDuplicateSelection={duplicateSelection}
			appMode={mode}
			routeSearchParams={routeSearchParams}
			startupAction={startupAction}
			onStartupActionHandled={onStartupActionHandled}
		/>
	);
}
