import {
	type ChangeEvent,
	type CSSProperties,
	type Dispatch,
	type PointerEvent as ReactPointerEvent,
	type Ref,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { ShortcutPlatform } from "@/lib/shortcuts";
import {
	getAccentColorForDarkThemeSelection,
	getAccentColorForLightThemeSelection,
	type ResolvedTheme,
	resolveAccentSurfaceColors,
	resolveEditorAccentColor,
	resolveStickyGuideColors,
} from "@/lib/theme";
import type { DocumentFontFamily } from "../api/documentViewApi";
import { isTextNode, validateLinks } from "../api/documentViewApi";
import type {
	DocumentNode,
	EditorState,
	StickyGeometrySnapshot,
} from "../api/editorApi";
import {
	addDocumentFontFamily,
	purgeUnusedDocumentFonts,
	removeDocumentFontFamily,
	toggleDocumentFontFavorite,
} from "../api/fontApi";
import { renderSiteCss } from "../api/siteApi";
import {
	clampFocusedPanelOffset,
	FOCUSED_PANEL_RIGHT_OFFSET_PX,
} from "../editor/focusedPanelPosition";
import {
	EDITOR_PERSISTENCE_STATUS_EVENT,
	formatStorageBytes,
	getEditorPersistenceStatus,
	type EditorPersistenceStatus,
} from "../editor/editorPersistence";
import { useDebugLogger } from "../editor/useDebugLogger";
import { buildDocumentGoogleFontsStylesheetHref } from "../fonts";
import type { HelpEntry } from "../panels/helpDocs";
import {
	INSPECTOR_COLLAPSED_WIDTH_PX,
	INSPECTOR_EXPANDED_WIDTH_PX,
} from "../panels/inspectorLayout";
import type { SettingsSectionId } from "../panels/settings/settingsSections";
import type { ActionResult } from "../panels/settingsTransfer";
import type { MediaTypeRole, TextTypeRole } from "./AppChrome";
import { AppShellEditorMain } from "./AppShellEditorMain";
import { AppShellOverlays } from "./AppShellOverlays";
import { PreviewMode } from "./AppShellPreview";
import {
	type AppMode,
	type AppStartupAction,
	HOME_ROUTE_HASH,
} from "./appRouting";
import type { HistoryAction, HistoryState } from "./editorState";
import type {
	EditorPanelRequest,
	EditorPanelState,
	EditorSettingsSectionId,
} from "../api/editorNavigationApi";
import { applyPanelRequestWithCallbacks } from "./panelRequestAdapter";
import { getOrCreateEditorWindowId } from "./previewWindow";
import { useShowcaseTourController } from "./showcaseTour/useShowcaseTourController";

type Props = {
	state: EditorState;
	historyState: Pick<HistoryState, "past" | "future" | "historyLimit">;
	selectedNode: DocumentNode | null;
	selectedNodes: DocumentNode[];
	orderState: { show: boolean; canBack: boolean; canForward: boolean };
	sectionOrderState: { canBack: boolean; canForward: boolean };
	resolvedTheme: ResolvedTheme;
	shortcutPlatform: ShortcutPlatform;
	topbarClass: string;
	stageSelectableIds: string[];
	settingsOpen: boolean;
	manageFontsOpen?: boolean;
	helpOpen: boolean;
	shortcutsOpen?: boolean;
	aboutOpen?: boolean;
	layersOpen?: boolean;
	pagesOpen?: boolean;
	layersPosition?: { top: number; left: number };
	pagesPosition?: { top: number; left: number };
	sectionTemplateOpen: boolean;
	textTypeOpen: boolean;
	mediaTypeOpen: boolean;
	settingsPanelRef: Ref<HTMLDivElement>;
	layersPanelRef?: Ref<HTMLDivElement>;
	pagesPanelRef?: Ref<HTMLDivElement>;
	aiPanelRef?: Ref<HTMLDivElement>;
	sectionTemplatePanelRef: Ref<HTMLDivElement>;
	textTypePanelRef: Ref<HTMLDivElement>;
	mediaTypePanelRef: Ref<HTMLDivElement>;
	documentJson: string;
	dispatch: Dispatch<HistoryAction>;
	onStickyGeometryChange: (geometry: StickyGeometrySnapshot) => void;
	onOpenLayers?: (trigger: HTMLElement) => void;
	onOpenPages?: () => void;
	onLayersOpenChange?: (open: boolean) => void;
	onLayersPositionChange?: (position: { top: number; left: number }) => void;
	onPagesPositionChange?: (position: { top: number; left: number }) => void;
	onCloseLayers?: () => void;
	aiOpen?: boolean;
	aiPosition?: { top: number; left: number };
	onAiOpenChange?: (open: boolean) => void;
	onAiPositionChange?: (position: { top: number; left: number }) => void;
	onCloseAi?: () => void;
	onOpenAiSettings?: () => void;
	onOpenSectionTemplates: (trigger: HTMLElement) => void;
	onSectionTemplateOpenChange: (open: boolean) => void;
	onCloseSectionTemplates: () => void;
	onOpenTextTypes: (trigger: HTMLElement) => void;
	onTextTypeOpenChange: (open: boolean) => void;
	onCloseTextTypes: () => void;
	onInsertTextType: (role: TextTypeRole) => void;
	onOpenMediaTypes: (trigger: HTMLElement) => void;
	onMediaTypeOpenChange: (open: boolean) => void;
	onCloseMediaTypes: () => void;
	onInsertMediaType: (role: MediaTypeRole) => void;
	onSettingsOpenChange: (open: boolean) => void;
	onManageFontsOpenChange?: (open: boolean) => void;
	onHelpOpenChange: (open: boolean) => void;
	onShortcutsOpenChange?: (open: boolean) => void;
	onAboutOpenChange?: (open: boolean) => void;
	onPagesOpenChange?: (open: boolean) => void;
	onImportDocument: (raw: string) => Promise<ActionResult>;
	onResetData: () => void;
	onResetAll: () => void;
	onCopySelection: () => void | Promise<void>;
	onPasteClipboard: () => void | Promise<void>;
	onDuplicateSelection: () => void;
	appMode?: Extract<AppMode, "edit" | "preview">;
	routeSearchParams?: URLSearchParams;
	startupAction?: AppStartupAction | null;
	onStartupActionHandled?: (id: number) => void;
};

export function AppShell({
	state,
	historyState,
	selectedNode,
	selectedNodes,
	orderState,
	sectionOrderState,
	resolvedTheme,
	shortcutPlatform,
	topbarClass,
	stageSelectableIds,
	settingsOpen,
	manageFontsOpen = false,
	helpOpen,
	shortcutsOpen = false,
	aboutOpen = false,
	layersOpen = false,
	pagesOpen = false,
	layersPosition = { top: 112, left: 102 },
	pagesPosition = { top: 76, left: 416 },
	aiOpen = false,
	aiPosition = { top: 76, left: 80 },
	sectionTemplateOpen,
	textTypeOpen,
	mediaTypeOpen,
	settingsPanelRef,
	layersPanelRef,
	pagesPanelRef,
	aiPanelRef,
	sectionTemplatePanelRef,
	textTypePanelRef,
	mediaTypePanelRef,
	documentJson,
	dispatch,
	onStickyGeometryChange,
	onOpenLayers = () => undefined,
	onOpenPages = () => undefined,
	onLayersOpenChange = () => undefined,
	onLayersPositionChange = () => undefined,
	onPagesPositionChange = () => undefined,
	onCloseLayers = () => undefined,
	onAiOpenChange = () => undefined,
	onAiPositionChange = () => undefined,
	onCloseAi = () => undefined,
	onOpenAiSettings = () => undefined,
	onOpenSectionTemplates,
	onSectionTemplateOpenChange,
	onCloseSectionTemplates,
	onOpenTextTypes,
	onTextTypeOpenChange,
	onCloseTextTypes,
	onInsertTextType,
	onOpenMediaTypes,
	onMediaTypeOpenChange,
	onCloseMediaTypes,
	onInsertMediaType,
	onSettingsOpenChange,
	onManageFontsOpenChange = () => undefined,
	onHelpOpenChange,
	onShortcutsOpenChange = () => undefined,
	onAboutOpenChange = () => undefined,
	onPagesOpenChange = () => undefined,
	onImportDocument,
	onResetData,
	onResetAll,
	onCopySelection,
	onPasteClipboard,
	onDuplicateSelection,
	appMode = "edit",
	routeSearchParams,
	startupAction = null,
	onStartupActionHandled = () => undefined,
}: Props) {
	const searchParams = useMemo(
		() =>
			routeSearchParams
				? new URLSearchParams(routeSearchParams)
				: new URLSearchParams(),
		[routeSearchParams],
	);
	const isPreview = appMode === "preview";
	const editorWindowId = useMemo(() => getOrCreateEditorWindowId(), []);

	const [editorPersistenceStatus, setEditorPersistenceStatus] =
		useState<EditorPersistenceStatus>(() => getEditorPersistenceStatus(state));
	const [storageWarningDismissed, setStorageWarningDismissed] = useState(false);
	const [linkPopupVisible, setLinkPopupVisible] = useState(false);
	const [requestedPageSettingsId, setRequestedPageSettingsId] = useState<
		string | null
	>(null);
	const [pagesPanelTabTarget, setPagesPanelTabTarget] = useState<
		"page" | "settings"
	>("page");
	const [settingsSectionTarget, setSettingsSectionTarget] = useState<
		SettingsSectionId | undefined
	>(undefined);
	const [helpEntryTarget, setHelpEntryTarget] = useState<
		HelpEntry["id"] | undefined
	>(undefined);
	const [linkValidationErrors, setLinkValidationErrors] = useState(
		null as ReturnType<typeof validateLinks> | null,
	);
	const importInputRef = useRef<HTMLInputElement | null>(null);
	const handledStartupActionIdRef = useRef<number | null>(null);
	const panelStateSnapshot = useMemo<EditorPanelState>(
		() => ({
			settingsOpen,
			manageFontsOpen,
			helpOpen,
			shortcutsOpen,
			aboutOpen,
			componentsOpen: layersOpen,
			pagesOpen,
			sectionTemplateOpen,
			textTypeOpen,
			mediaTypeOpen,
			aiOpen,
			componentsPosition: layersPosition,
			pagesPosition,
			componentsPositionCustomized: false,
			pagesPositionCustomized: false,
			settingsSectionTarget: settingsSectionTarget as
				| EditorSettingsSectionId
				| undefined,
			helpEntryTarget,
			pagesPanelTabTarget,
			requestedPageSettingsId,
		}),
		[
			settingsOpen,
			manageFontsOpen,
			helpOpen,
			shortcutsOpen,
			aboutOpen,
			layersOpen,
			pagesOpen,
			sectionTemplateOpen,
			textTypeOpen,
			mediaTypeOpen,
			aiOpen,
			layersPosition,
			pagesPosition,
			settingsSectionTarget,
			helpEntryTarget,
			pagesPanelTabTarget,
			requestedPageSettingsId,
		],
	);
	const panelStateSnapshotRef = useRef(panelStateSnapshot);
	panelStateSnapshotRef.current = panelStateSnapshot;
	const applyPanelRequest = useCallback(
		(request: EditorPanelRequest) => {
			// Chain the pure result back into the snapshot so multiple requests
			// applied in one tick (a tour panel scene) diff against each other,
			// not against the same pre-render state. The next render rebuilds the
			// snapshot from props.
			panelStateSnapshotRef.current = applyPanelRequestWithCallbacks(
				panelStateSnapshotRef.current,
				request,
				{
					onSettingsOpenChange,
					onManageFontsOpenChange,
					onHelpOpenChange,
					onShortcutsOpenChange,
					onAboutOpenChange,
					onComponentsOpenChange: onLayersOpenChange,
					onComponentsPositionChange: onLayersPositionChange,
					onPagesOpenChange,
					onPagesPositionChange,
					onSectionTemplatesOpenChange: onSectionTemplateOpenChange,
					onTextTypesOpenChange: onTextTypeOpenChange,
					onMediaTypesOpenChange: onMediaTypeOpenChange,
					onAiOpenChange,
					onSettingsSectionTargetChange: (section) =>
						setSettingsSectionTarget(section as SettingsSectionId),
					onHelpEntryTargetChange: (entryId) =>
						setHelpEntryTarget(entryId as HelpEntry["id"] | undefined),
					onPagesPanelTabTargetChange: setPagesPanelTabTarget,
					onRequestedPageSettingsIdChange: setRequestedPageSettingsId,
				},
			);
		},
		[
			onSettingsOpenChange,
			onManageFontsOpenChange,
			onHelpOpenChange,
			onShortcutsOpenChange,
			onAboutOpenChange,
			onLayersOpenChange,
			onLayersPositionChange,
			onPagesOpenChange,
			onPagesPositionChange,
			onSectionTemplateOpenChange,
			onTextTypeOpenChange,
			onMediaTypeOpenChange,
			onAiOpenChange,
		],
	);
	const {
		showcaseTourLocation,
		setShowcaseTourLocation,
		handleApplyShowcaseTourNavigation,
		handleOpenShowcaseTour,
		handleCloseShowcaseTour,
	} = useShowcaseTourController({
		searchParams,
		state,
		dispatch,
		applyPanelRequest,
	});

	const activateRichEditRef = useRef<(id: string) => void>(() => {});
	const focusedPanelRef = useRef<HTMLDivElement | null>(null);
	const focusedPanelDragRef = useRef<{
		pointerId: number;
		originX: number;
		originY: number;
		originOffset: EditorState["ui"]["focusedPanelOffset"];
	} | null>(null);
	const focusedPanelOffsetDraftRef = useRef(state.ui.focusedPanelOffset);
	const [focusedPanelOffsetDraft, setFocusedPanelOffsetDraft] = useState(
		state.ui.focusedPanelOffset,
	);
	const [focusedPanelDragging, setFocusedPanelDragging] = useState(false);
	const siteNode = state.document.nodes[state.document.rootId];
	const globalStickyElevation =
		siteNode?.contentType === "site"
			? (siteNode.stickyElevation ?? true)
			: true;
	const previewCss = useMemo(
		() =>
			renderSiteCss(state.document, { previewSticky: state.ui.previewSticky }),
		[state.document, state.ui.previewSticky],
	);
	const previewFontHref = useMemo(
		() => buildDocumentGoogleFontsStylesheetHref(state.document),
		[state.document],
	);
	const isSidebarCollapsed =
		state.ui.inspectorCollapsed && !state.ui.temporaryInspectorOpen;
	const leftRailWidth = `${INSPECTOR_COLLAPSED_WIDTH_PX}px`;
	const sidebarWidth = isSidebarCollapsed
		? `${INSPECTOR_COLLAPSED_WIDTH_PX}px`
		: `${INSPECTOR_EXPANDED_WIDTH_PX}px`;
	const focusedPanelRightOffsetPx =
		INSPECTOR_COLLAPSED_WIDTH_PX + FOCUSED_PANEL_RIGHT_OFFSET_PX;
	const sidebarTransitionTiming = isSidebarCollapsed ? "ease-in" : "ease-out";
	const resolvedAccent = resolveEditorAccentColor(state.ui.accentColor);
	const stickyGuideColors = resolveStickyGuideColors(resolvedAccent);
	const accentSurfaceColors = resolveAccentSurfaceColors(
		resolvedAccent,
		stickyGuideColors,
	);
	const showStorageWarning =
		!storageWarningDismissed && editorPersistenceStatus.kind !== "ok";
	const storageWarningMessage =
		editorPersistenceStatus.kind === "quota-error"
			? `Editor changes could not be saved because localStorage is full. Current payload is ${formatStorageBytes(editorPersistenceStatus.byteLength)} of roughly ${formatStorageBytes(editorPersistenceStatus.quotaEstimateBytes)}. Export JSON or clear unused data before continuing.`
			: `Editor data is ${formatStorageBytes(editorPersistenceStatus.byteLength)}, above the ${formatStorageBytes(editorPersistenceStatus.warningThresholdBytes)} localStorage warning threshold. Export JSON or clear unused data before the browser quota is reached.`;

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		window.name = isPreview
			? `sticky-preview-${editorWindowId}`
			: `sticky-editor-${editorWindowId}`;
	}, [editorWindowId, isPreview]);

	useEffect(() => {
		focusedPanelOffsetDraftRef.current = focusedPanelOffsetDraft;
	}, [focusedPanelOffsetDraft]);

	useEffect(() => {
		if (!focusedPanelDragging) {
			setFocusedPanelOffsetDraft(state.ui.focusedPanelOffset);
		}
	}, [focusedPanelDragging, state.ui.focusedPanelOffset]);

	useEffect(() => {
		if (!focusedPanelDragging || typeof document === "undefined") {
			return;
		}

		const { cursor, userSelect } = document.body.style;
		document.body.style.cursor = "grabbing";
		document.body.style.userSelect = "none";

		return () => {
			document.body.style.cursor = cursor;
			document.body.style.userSelect = userSelect;
		};
	}, [focusedPanelDragging]);

	useEffect(() => {
		if (!focusedPanelDragging) {
			return;
		}

		function finishFocusedPanelDrag(
			nextOffset: EditorState["ui"]["focusedPanelOffset"],
		) {
			focusedPanelDragRef.current = null;
			setFocusedPanelDragging(false);
			if (
				nextOffset.x !== state.ui.focusedPanelOffset.x ||
				nextOffset.y !== state.ui.focusedPanelOffset.y
			) {
				dispatch({ type: "setFocusedPanelOffset", value: nextOffset });
			}
		}

		function handlePointerMove(event: PointerEvent) {
			if (
				!focusedPanelDragRef.current ||
				event.pointerId !== focusedPanelDragRef.current.pointerId ||
				!focusedPanelRef.current
			) {
				return;
			}

			const panelRect = focusedPanelRef.current.getBoundingClientRect();
			const nextOffset = clampFocusedPanelOffset({
				offset: focusedPanelDragRef.current.originOffset,
				deltaX: event.clientX - focusedPanelDragRef.current.originX,
				deltaY: event.clientY - focusedPanelDragRef.current.originY,
				containerWidth: window.innerWidth,
				containerHeight: Math.max(0, window.innerHeight - 56),
				panelWidth: panelRect.width,
				panelHeight: panelRect.height,
				rightOffset: focusedPanelRightOffsetPx,
			});
			setFocusedPanelOffsetDraft(nextOffset);
		}

		function handlePointerEnd(event: PointerEvent) {
			if (
				!focusedPanelDragRef.current ||
				event.pointerId !== focusedPanelDragRef.current.pointerId
			) {
				return;
			}
			finishFocusedPanelDrag(focusedPanelOffsetDraftRef.current);
		}

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerEnd);
		window.addEventListener("pointercancel", handlePointerEnd);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerEnd);
			window.removeEventListener("pointercancel", handlePointerEnd);
		};
	}, [
		dispatch,
		focusedPanelDragging,
		focusedPanelRightOffsetPx,
		state.ui.focusedPanelOffset,
	]);

	useDebugLogger(state.ui.showDebugInfo, state.document, state.selectedId);

	useEffect(() => {
		setEditorPersistenceStatus(getEditorPersistenceStatus(state));
	}, [state]);

	useEffect(() => {
		if (editorPersistenceStatus.kind === "ok") {
			setStorageWarningDismissed(false);
		}
	}, [editorPersistenceStatus.kind]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		function handlePersistenceStatus(event: Event) {
			const detail = (event as CustomEvent<EditorPersistenceStatus>).detail;
			if (!detail) {
				return;
			}
			setEditorPersistenceStatus(detail);
			if (detail.kind === "quota-error") {
				setStorageWarningDismissed(false);
			}
		}
		window.addEventListener(
			EDITOR_PERSISTENCE_STATUS_EVENT,
			handlePersistenceStatus,
		);
		return () => {
			window.removeEventListener(
				EDITOR_PERSISTENCE_STATUS_EVENT,
				handlePersistenceStatus,
			);
		};
	}, []);

	useEffect(() => {
		const node = state.selectedId
			? state.document.nodes[state.selectedId]
			: null;
		if (node && isTextNode(node) && node.link !== undefined) {
			setLinkPopupVisible(true);
		} else {
			setLinkPopupVisible(false);
		}
	}, [state.selectedId, state.document.nodes]);

	useEffect(() => {
		if (!settingsOpen) {
			setSettingsSectionTarget(undefined);
		}
	}, [settingsOpen]);

	useEffect(() => {
		if (!helpOpen) {
			setHelpEntryTarget(undefined);
		}
	}, [helpOpen]);

	useEffect(() => {
		if (
			!startupAction ||
			startupAction.type !== "loadJson" ||
			handledStartupActionIdRef.current === startupAction.id
		) {
			return;
		}
		handledStartupActionIdRef.current = startupAction.id;
		importInputRef.current?.click();
		onStartupActionHandled(startupAction.id);
	}, [onStartupActionHandled, startupAction]);

	function handleStageSelect(
		id: string,
		mode: "replace" | "toggle" = "replace",
	) {
		if (mode !== "toggle") {
			const node = state.document.nodes[id];
			if (
				node &&
				isTextNode(node) &&
				node.link !== undefined &&
				id === state.selectedId
			) {
				setLinkPopupVisible((v) => !v);
			}
		}
		dispatch(
			mode === "toggle" ? { type: "toggleSelect", id } : { type: "select", id },
		);
	}

	function handleFocusedPanelDragStart(
		event: ReactPointerEvent<HTMLDivElement>,
	) {
		if (event.button !== 0) {
			return;
		}
		event.preventDefault();
		focusedPanelDragRef.current = {
			pointerId: event.pointerId,
			originX: event.clientX,
			originY: event.clientY,
			originOffset: focusedPanelOffsetDraft,
		};
		setFocusedPanelDragging(true);
	}

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

	function handleAddDocumentFont(family: DocumentFontFamily) {
		dispatch({
			type: "importDocument",
			document: addDocumentFontFamily(state.document, family),
		});
	}

	function handleRemoveDocumentFont(familyName: string) {
		dispatch({
			type: "importDocument",
			document: removeDocumentFontFamily(state.document, familyName),
		});
	}

	function handleToggleDocumentFontFavorite(familyName: string) {
		dispatch({
			type: "importDocument",
			document: toggleDocumentFontFavorite(state.document, familyName),
		});
	}

	function handlePurgeUnusedFonts() {
		dispatch({
			type: "importDocument",
			document: purgeUnusedDocumentFonts(state.document),
		});
	}

	function handleOpenPagesPanel() {
		setRequestedPageSettingsId(null);
		setPagesPanelTabTarget("page");
		onOpenPages();
	}

	function handleOpenCurrentPageSettings() {
		if (!state.activePageId) return;
		setRequestedPageSettingsId(state.activePageId);
		setPagesPanelTabTarget("page");
		onOpenPages();
	}

	function handleValidateLinks() {
		const errors = validateLinks(state.document);
		setLinkValidationErrors(errors);
		return errors;
	}

	function handleOpenLinkValidation() {
		handleValidateLinks();
		setSettingsSectionTarget("transfer");
		onSettingsOpenChange(true);
	}

	function handleOpenSettingsSection(section: SettingsSectionId) {
		setSettingsSectionTarget(section);
		onSettingsOpenChange(true);
	}

	function handleSetLightTheme(value: typeof state.ui.lightTheme) {
		dispatch({ type: "setThemeMode", value: "light" });
		dispatch({
			type: "setAccentColor",
			value: getAccentColorForLightThemeSelection(value, state.ui.accentColor),
		});
		dispatch({ type: "setLightTheme", value });
	}

	function handleSetDarkTheme(value: typeof state.ui.darkTheme) {
		dispatch({ type: "setThemeMode", value: "dark" });
		dispatch({
			type: "setAccentColor",
			value: getAccentColorForDarkThemeSelection(value, state.ui.accentColor),
		});
		dispatch({ type: "setDarkTheme", value });
	}

	async function handleImportJson() {
		importInputRef.current?.click();
	}

	function handleStartFresh() {
		if (typeof window === "undefined") {
			return;
		}
		window.location.hash = HOME_ROUTE_HASH;
	}

	async function handleImportJsonFile(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) {
			return;
		}
		const raw = await file.text();
		await onImportDocument(raw);
	}

	async function handleExportJson() {
		const { saveExportDocument } = await import("../panels/settingsTransfer");
		await saveExportDocument(documentJson);
	}

	async function handleExportSite() {
		const { renderSiteExportBundles, buildRouteManifest, buildHostingConfigs } =
			await import("../api/siteApi");
		const { saveExportSiteZip } = await import("../panels/settingsTransfer");
		const exportOptions = {
			outputStructure: state.document.siteSettings?.outputStructure,
		};
		const bundles = renderSiteExportBundles(state.document, exportOptions);
		const manifest = buildRouteManifest(state.document, exportOptions);
		const hostingConfigs = buildHostingConfigs(state.document, exportOptions);
		const files: Record<string, string> = {
			"route-manifest.json": JSON.stringify(manifest, null, 2),
			...hostingConfigs,
		};
		for (const bundle of bundles) {
			files[bundle.path] = bundle.htmlDocument;
		}
		await saveExportSiteZip(files, { fileName: "editor-playground-site.zip" });
	}

	const selectedLinkNode = (() => {
		if (!state.selectedId) return null;
		const node = state.document.nodes[state.selectedId];
		if (
			node &&
			isTextNode(node) &&
			node.subtype !== "rich" &&
			node.link !== undefined
		)
			return node;
		return null;
	})();

	if (isPreview) {
		return (
			<PreviewMode
				css={previewCss}
				fontHref={previewFontHref}
				document={state.document}
				previewSticky={true}
				pageId={state.activePageId ?? undefined}
			/>
		);
	}

	const renderContext = {
		state,
		editorWindowId,
		linkPopupVisible,
		sectionTemplateOpen,
		textTypeOpen,
		mediaTypeOpen,
		setRequestedPageSettingsId,
		setHelpEntryTarget,
		historyState,
		selectedNode,
		selectedNodes,
		orderState,
		sectionOrderState,
		resolvedTheme,
		shortcutPlatform,
		topbarClass,
		stageSelectableIds,
		settingsOpen,
		manageFontsOpen,
		helpOpen,
		shortcutsOpen,
		aboutOpen,
		layersOpen,
		pagesOpen,
		aiOpen,
		layersPosition,
		pagesPosition,
		aiPosition,
		settingsPanelRef,
		layersPanelRef,
		pagesPanelRef,
		aiPanelRef,
		sectionTemplatePanelRef,
		textTypePanelRef,
		mediaTypePanelRef,
		documentJson,
		dispatch,
		onStickyGeometryChange,
		onOpenLayers,
		onLayersOpenChange,
		onLayersPositionChange,
		onPagesPositionChange,
		onCloseLayers,
		onAiOpenChange,
		onAiPositionChange,
		onCloseAi,
		onOpenAiSettings: () => {
			setSettingsSectionTarget("ai");
			onOpenAiSettings();
			onSettingsOpenChange(true);
		},
		onToggleAi: () => onAiOpenChange(!aiOpen),
		onOpenSectionTemplates,
		onSectionTemplateOpenChange,
		onCloseSectionTemplates,
		onOpenTextTypes,
		onTextTypeOpenChange,
		onCloseTextTypes,
		onInsertTextType,
		onOpenMediaTypes,
		onMediaTypeOpenChange,
		onCloseMediaTypes,
		onInsertMediaType,
		onSettingsOpenChange,
		onManageFontsOpenChange,
		onHelpOpenChange,
		onShortcutsOpenChange,
		onAboutOpenChange,
		onPagesOpenChange,
		onImportDocument,
		onResetData,
		onResetAll,
		onCopySelection,
		onPasteClipboard,
		onDuplicateSelection,
		showStorageWarning,
		storageWarningMessage,
		onDismissStorageWarning: () => setStorageWarningDismissed(true),
		requestedPageSettingsId,
		pagesPanelTabTarget,
		settingsSectionTarget,
		helpEntryTarget,
		linkValidationErrors,
		importInputRef,
		activateRichEditRef,
		focusedPanelRef,
		focusedPanelOffsetDraft,
		focusedPanelDragging,
		focusedPanelRightOffsetPx,
		globalStickyElevation,
		leftRailWidth,
		sidebarWidth,
		sidebarTransitionTiming,
		resolvedAccent,
		accentSurfaceColors,
		stickyGuideColors,
		selectedLinkNode,
		setLinkPopupVisible,
		handleStageSelect,
		collectSelectionRects,
		handleFocusedPanelDragStart,
		handleAddDocumentFont,
		handleRemoveDocumentFont,
		handleToggleDocumentFontFavorite,
		handlePurgeUnusedFonts,
		handleOpenPagesPanel,
		handleOpenCurrentPageSettings,
		handleValidateLinks,
		handleOpenLinkValidation,
		handleOpenSettingsSection,
		handleOpenShowcaseTour,
		handleStartFresh,
		showcaseTourLocation,
		setShowcaseTourLocation,
		handleApplyShowcaseTourNavigation,
		handleCloseShowcaseTour,
		handleSetLightTheme,
		handleSetDarkTheme,
		handleImportJson,
		handleImportJsonFile,
		handleExportJson,
		handleExportSite,
	};

	return (
		<div
			className="editor-shell h-screen w-screen overflow-hidden"
			data-editor-theme={resolvedTheme}
			data-theme-mode={state.ui.themeMode}
			data-editor-light-theme={state.ui.lightTheme}
			data-editor-dark-theme={state.ui.darkTheme}
			style={
				{
					"--editor-accent": resolvedAccent,
					"--editor-accent-foreground": accentSurfaceColors.accentForeground,
					"--editor-accent-foreground-muted":
						accentSurfaceColors.accentForegroundMuted,
					"--editor-sticky-offset-guide-color":
						stickyGuideColors.offsetGuideColor,
					"--editor-sticky-padding-guide-color":
						stickyGuideColors.paddingGuideColor,
					"--editor-sticky-offset-label-background":
						stickyGuideColors.offsetLabelBackground,
					"--editor-sticky-auto-guide-color": stickyGuideColors.autoGuideColor,
					"--editor-sticky-auto-label-background":
						stickyGuideColors.autoLabelBackground,
					"--editor-sticky-distance-label-text":
						accentSurfaceColors.stickyDistanceLabelText,
					"--editor-sticky-offset-label-text":
						accentSurfaceColors.stickyOffsetLabelText,
					"--editor-sticky-auto-label-text":
						accentSurfaceColors.stickyAutoLabelText,
				} as CSSProperties
			}
		>
			<AppShellEditorMain ctx={renderContext} />
			<AppShellOverlays ctx={renderContext} />
		</div>
	);
}
