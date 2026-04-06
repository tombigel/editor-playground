import {
	lazy,
	Suspense,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
	type CSSProperties,
	type Dispatch,
	type PointerEvent as ReactPointerEvent,
	type Ref,
} from "react";
import { Magnet, Play, ScanEye, Type } from "lucide-react";
import type {
	DocumentNode,
	EditorState,
	StickyGeometrySnapshot,
} from "../api/editorApi";
import type { DocumentFontFamily } from "../model/types";
import { isTextNode } from "../model/types";
import { buildDocumentGoogleFontsStylesheetHref } from "../fonts";
import {
	addDocumentFontFamily,
	purgeUnusedDocumentFonts,
	removeDocumentFontFamily,
	toggleDocumentFontFavorite,
} from "../api/fontApi";
import { InsertPanel } from "../panels/InsertPanel";
import { EditorPanelHeader } from "../panels/EditorPanelHeader";
import { HelpDialog } from "../panels/HelpDialog";
import { ShortcutsDialog } from "../panels/ShortcutsDialog";
import { AboutDialog } from "../panels/AboutDialog";
import {
	INSPECTOR_COLLAPSED_WIDTH_PX,
	INSPECTOR_EXPANDED_WIDTH_PX,
	INSPECTOR_TRANSITION_MS,
} from "../panels/inspectorLayout";
import { EditorTopbar } from "./EditorTopbar";
const LayersPanel = lazy(() =>
	import("../panels/LayersPanel").then((m) => ({ default: m.LayersPanel })),
);
const SettingsPanel = lazy(() =>
	import("../panels/SettingsPanel").then((m) => ({ default: m.SettingsPanel })),
);
const ManageFontsPanel = lazy(() =>
	import("../panels/fontManagement/ManageFontsPanel").then((m) => ({
		default: m.ManageFontsPanel,
	})),
);
const PagesPanel = lazy(() =>
	import("../panels/PagesPanel").then((m) => ({ default: m.PagesPanel })),
);
const EditorSidebar = lazy(() =>
	import("../panels/EditorSidebar").then((m) => ({ default: m.EditorSidebar })),
);
import { FocusedModePanel } from "../panels/FocusedModePanel";
import { BackToEditorButton } from "../panels/BackToEditorButton";
import { SiteRenderer } from "../site/SiteRenderer";
import { renderSiteCss } from "../api/siteApi";
import type { ActionResult } from "../panels/settingsTransfer";
import { Stage } from "../api/editorViewApi";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { PopoverSurface } from "@/components/ui/popover";
import { getShortcutLabel, type ShortcutPlatform } from "@/lib/shortcuts";
import {
	getAccentColorForDarkThemeSelection,
	getAccentColorForLightThemeSelection,
	resolveAccentSurfaceColors,
	resolveEditorAccentColor,
	resolveStickyGuideColors,
	type ResolvedTheme,
} from "@/lib/theme";
import {
	clampFocusedPanelOffset,
	FOCUSED_PANEL_RIGHT_OFFSET_PX,
	FOCUSED_PANEL_TOP_OFFSET_PX,
} from "../editor/focusedPanelPosition";
import { useDebugLogger } from "../editor/useDebugLogger";
import {
	RailToggleButton,
	SectionTemplatePopover,
	TextTypePopover,
	SpacerIcon,
} from "./AppChrome";
import type { TextTypeRole } from "./AppChrome";
import type { HistoryAction, HistoryState } from "./editorState";
import type { SettingsSectionId } from "../panels/settings/settingsSections";
import type { HelpEntry } from "../panels/helpDocs";
import { validateLinks } from "../model/validation";

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
	settingsPanelRef: Ref<HTMLDivElement>;
	layersPanelRef?: Ref<HTMLDivElement>;
	pagesPanelRef?: Ref<HTMLDivElement>;
	sectionTemplatePanelRef: Ref<HTMLDivElement>;
	textTypePanelRef: Ref<HTMLDivElement>;
	documentJson: string;
	dispatch: Dispatch<HistoryAction>;
	onStickyGeometryChange: (geometry: StickyGeometrySnapshot) => void;
	onOpenLayers?: (trigger: HTMLElement) => void;
	onOpenPages?: () => void;
	onLayersOpenChange?: (open: boolean) => void;
	onLayersPositionChange?: (position: { top: number; left: number }) => void;
	onPagesPositionChange?: (position: { top: number; left: number }) => void;
	onCloseLayers?: () => void;
	onOpenSectionTemplates: (trigger: HTMLElement) => void;
	onSectionTemplateOpenChange: (open: boolean) => void;
	onCloseSectionTemplates: () => void;
	onOpenTextTypes: (trigger: HTMLElement) => void;
	onTextTypeOpenChange: (open: boolean) => void;
	onCloseTextTypes: () => void;
	onInsertTextType: (role: TextTypeRole) => void;
	onSettingsOpenChange: (open: boolean) => void;
	onManageFontsOpenChange?: (open: boolean) => void;
	onHelpOpenChange: (open: boolean) => void;
	onShortcutsOpenChange?: (open: boolean) => void;
	onAboutOpenChange?: (open: boolean) => void;
	onPagesOpenChange?: (open: boolean) => void;
	onImportDocument: (raw: string) => Promise<ActionResult>;
	onResetData: () => void;
	onResetAll: () => void;
};

type PreviewSiteAssetsProps = {
	css: string;
	fontHref: string | null;
};

function PreviewSiteAssets({ css, fontHref }: PreviewSiteAssetsProps) {
	return (
		<>
			{fontHref ? (
				<>
					<link rel="preconnect" href="https://fonts.googleapis.com" />
					<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
					<link rel="stylesheet" href={fontHref} />
				</>
			) : null}
			<style data-preview-site-css="true">{css}</style>
		</>
	);
}

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
	sectionTemplateOpen,
	textTypeOpen,
	settingsPanelRef,
	layersPanelRef,
	pagesPanelRef,
	sectionTemplatePanelRef,
	textTypePanelRef,
	documentJson,
	dispatch,
	onStickyGeometryChange,
	onOpenLayers = () => undefined,
	onOpenPages = () => undefined,
	onLayersOpenChange = () => undefined,
	onLayersPositionChange = () => undefined,
	onPagesPositionChange = () => undefined,
	onCloseLayers = () => undefined,
	onOpenSectionTemplates,
	onSectionTemplateOpenChange,
	onCloseSectionTemplates,
	onOpenTextTypes,
	onTextTypeOpenChange,
	onCloseTextTypes,
	onInsertTextType,
	onSettingsOpenChange,
	onManageFontsOpenChange = () => undefined,
	onHelpOpenChange,
	onShortcutsOpenChange = () => undefined,
	onAboutOpenChange = () => undefined,
	onPagesOpenChange = () => undefined,
	onImportDocument,
	onResetData,
	onResetAll,
}: Props) {
	const searchParams = useMemo(
		() =>
			typeof window !== "undefined"
				? new URLSearchParams(window.location.search)
				: new URLSearchParams(),
		[],
	);
	const isPreview = searchParams.get("mode") === "preview";
	const editorWindowId = useMemo(() => {
		if (typeof window === "undefined") {
			return "server";
		}

		const storageKey = "sticky-window-group-id";
		const storage = "localStorage" in window ? window.localStorage : undefined;
		const existingId = storage?.getItem(storageKey);
		if (existingId) {
			return existingId;
		}

		const nextId =
			typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
				? crypto.randomUUID()
				: `${Date.now()}-${Math.random().toString(36).slice(2)}`;
		storage?.setItem(storageKey, nextId);
		return nextId;
	}, []);

	const [showStorageWarning, setShowStorageWarning] = useState(false);
	const [linkPopupVisible, setLinkPopupVisible] = useState(false);
	const [requestedPageSettingsId, setRequestedPageSettingsId] = useState<string | null>(null);
	const [pagesPanelTabTarget, setPagesPanelTabTarget] = useState<"page" | "settings">("page");
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

	const focusedPanelRef = useRef<HTMLDivElement | null>(null);
	const focusedPanelDragRef = useRef<{
		pointerId: number;
		originX: number;
		originY: number;
		originOffset: EditorState["ui"]["focusedPanelOffset"];
	} | null>(null);
	const focusedPanelOffsetDraftRef = useRef(state.ui.focusedPanelOffset);
	const storageWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const [focusedPanelOffsetDraft, setFocusedPanelOffsetDraft] = useState(
		state.ui.focusedPanelOffset,
	);
	const [focusedPanelDragging, setFocusedPanelDragging] = useState(false);
	const siteNode = state.document.nodes[state.document.rootId];
	const globalStickyElevation =
		siteNode?.contentType === "site" ? (siteNode.stickyElevation ?? true) : true;
	const previewCss = useMemo(
		() => renderSiteCss(state.document, { previewSticky: state.ui.previewSticky }),
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
		const timer = setTimeout(() => {
			const size = JSON.stringify(state.document).length * 2;
			if (size > 4 * 1024 * 1024) {
				setShowStorageWarning(true);
			}
		}, 2000);
		storageWarningTimerRef.current = timer;
		return () => clearTimeout(timer);
	}, [state.document]);

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

	function handleStageSelect(
		id: string,
		mode: "replace" | "toggle" = "replace",
	) {
		if (mode !== "toggle") {
			const node = state.document.nodes[id];
			if (
				node && isTextNode(node) &&
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
		await saveExportSiteZip(files, { fileName: "sticky-playground-site.zip" });
	}

	const selectedLinkNode = (() => {
		if (!state.selectedId) return null;
		const node = state.document.nodes[state.selectedId];
		if (node && isTextNode(node) && node.link !== undefined) return node;
		return null;
	})();

	if (isPreview) {
		return (
			<>
				<PreviewSiteAssets css={previewCss} fontHref={previewFontHref} />
				<div style={{ position: "fixed", inset: 0, overflow: "auto" }}>
					<SiteRenderer
						document={state.document}
						includeAnimations
						previewSticky={state.ui.previewSticky}
						pageId={state.activePageId ?? undefined}
					/>
				</div>
				<BackToEditorButton />
			</>
		);
	}

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
			<div className="grid h-full grid-rows-[52px_minmax(0,1fr)]">
				<EditorTopbar
					topbarClass={topbarClass}
					shortcutPlatform={shortcutPlatform}
					pages={state.document.pages ?? []}
					activePageId={state.activePageId}
					previewSticky={state.ui.previewSticky}
					animationPreviewEnabled={state.ui.animationPreview.enabled}
					spacerVisibility={state.ui.spacerVisibility}
					showGridLanes={state.ui.showGridLanes}
					snapEnabled={state.ui.snapSettings.guideSnap.enabled}
					showDebugInfo={state.ui.showDebugInfo}
					focusedMode={state.ui.focusedMode}
					themeMode={state.ui.themeMode}
					accentColor={state.ui.accentColor}
					resolvedTheme={resolvedTheme}
					lightTheme={state.ui.lightTheme}
					darkTheme={state.ui.darkTheme}
					historyState={historyState}
					canDeleteSelection={selectedNodes.length > 0}
					layersOpen={layersOpen}
					pagesOpen={pagesOpen}
					onSetActivePage={(pageId) =>
						dispatch({ type: "setActivePage", pageId })
					}
					onAddPage={() => dispatch({ type: "addPage" })}
					onUndo={() => dispatch({ type: "undo" })}
					onRedo={() => dispatch({ type: "redo" })}
					onPreview={() => {
						const previewUrl = new URL(
							window.location.pathname,
							window.location.origin,
						);
						previewUrl.searchParams.set("mode", "preview");
						window.open(previewUrl.toString(), `sticky-preview-${editorWindowId}`);
					}}
					onImportJson={handleImportJson}
					onExportJson={handleExportJson}
					onExportSite={handleExportSite}
					onOpenSettingsSection={handleOpenSettingsSection}
					onDeleteSelection={() => dispatch({ type: "delete" })}
					onSetLightTheme={handleSetLightTheme}
					onSetDarkTheme={handleSetDarkTheme}
					onTogglePreviewSticky={() =>
						dispatch({
							type: "setPreviewSticky",
							value: !state.ui.previewSticky,
						})
					}
					onToggleAnimationPreview={() =>
						dispatch({
							type: "setAnimationPreview",
							value: { enabled: !state.ui.animationPreview.enabled },
						})
					}
					onToggleSpacerVisibility={() =>
						dispatch({
							type: "setSpacerVisibility",
							value: state.ui.spacerVisibility === "all" ? "selected" : "all",
						})
					}
					onToggleShowGridLanes={() =>
						dispatch({
							type: "setShowGridLanes",
							value: !state.ui.showGridLanes,
						})
					}
					onToggleSnapEnabled={() =>
						dispatch({
							type: "setSnapSettings",
							value: {
								guideSnap: {
									enabled: !state.ui.snapSettings.guideSnap.enabled,
									threshold: state.ui.snapSettings.guideSnap.threshold,
									power: state.ui.snapSettings.guideSnap.power,
									maxSpeedPxPerSecond:
										state.ui.snapSettings.guideSnap.maxSpeedPxPerSecond,
								},
							},
						})
					}
					onOpenSnapSettings={() => handleOpenSettingsSection("display")}
					onToggleShowDebugInfo={() =>
						dispatch({
							type: "setShowDebugInfo",
							value: !state.ui.showDebugInfo,
						})
					}
					onSetFocusedMode={(value) =>
						dispatch({ type: "setFocusedMode", value })
					}
					onToggleLayersPanel={() => onLayersOpenChange(!layersOpen)}
					onTogglePagesPanel={() => onPagesOpenChange(!pagesOpen)}
					onOpenManageFonts={() => onManageFontsOpenChange(true)}
					onOpenShortcuts={() => onShortcutsOpenChange(true)}
					onOpenDocumentation={(entryId) => {
						setHelpEntryTarget(entryId);
						onHelpOpenChange(true);
					}}
					onOpenAbout={() => onAboutOpenChange(true)}
				/>
				<input
					ref={importInputRef}
					type="file"
					accept=".json,application/json"
					className="hidden"
					onChange={handleImportJsonFile}
				/>

				<div
					className="grid min-h-0 transition-[grid-template-columns] ease-out"
					style={{
						gridTemplateColumns: `${leftRailWidth} minmax(0,1fr) ${sidebarWidth}`,
						transitionDuration: `${INSPECTOR_TRANSITION_MS}ms`,
						transitionTimingFunction: sidebarTransitionTiming,
					}}
				>
					<nav
						aria-label="Editor tools"
						className="editor-rail-shell editor-border-subtle relative z-[360] overflow-visible border-r shadow-[inset_-1px_0_0_rgba(255,255,255,0.7)] backdrop-blur"
					>
						<div className="flex h-full flex-col overflow-visible p-3">
							<InsertPanel
								onOpenSectionTemplates={onOpenSectionTemplates}
								onOpenTextTypes={onOpenTextTypes}
								onInsertWrapper={(role) =>
									dispatch({ type: "insertWrapper", role })
								}
								onInsertLeaf={(role) => dispatch({ type: "insertLeaf", role })}
								layersOpen={layersOpen}
								onOpenLayers={onOpenLayers}
								onCloseLayers={onCloseLayers}
								pagesOpen={pagesOpen}
								onOpenPages={() => handleOpenPagesPanel()}
								onClosePages={() => onPagesOpenChange(false)}
							/>
							<div className="mt-auto flex justify-center pt-3">
								<div className="flex flex-col gap-2">
									<RailToggleButton
										icon={ScanEye}
										pressed={state.ui.previewSticky}
										label={
											state.ui.previewSticky
												? "Sticky preview on"
												: "Sticky preview off"
										}
										shortcut={getShortcutLabel(
											"togglePreviewSticky",
											shortcutPlatform,
										)}
										onClick={() =>
											dispatch({
												type: "setPreviewSticky",
												value: !state.ui.previewSticky,
											})
										}
									/>
									<RailToggleButton
										icon={Play}
										pressed={state.ui.animationPreview.enabled}
										label={
											state.ui.animationPreview.enabled
												? "Animation preview on"
												: "Animation preview off"
										}
										shortcut={getShortcutLabel(
											"toggleAnimationPreview",
											shortcutPlatform,
										)}
										onClick={() =>
											dispatch({
												type: "setAnimationPreview",
												value: { enabled: !state.ui.animationPreview.enabled },
											})
										}
									/>
									<RailToggleButton
										icon={SpacerIcon}
										pressed={state.ui.spacerVisibility === "all"}
										label={
											state.ui.spacerVisibility === "all"
												? "Show all spacers"
												: "Show selected spacers"
										}
										shortcut={getShortcutLabel(
											"toggleSpacerVisibility",
											shortcutPlatform,
										)}
										onClick={() =>
											dispatch({
												type: "setSpacerVisibility",
												value:
													state.ui.spacerVisibility === "all"
														? "selected"
														: "all",
											})
										}
									/>
									<RailToggleButton
										icon={Magnet}
										pressed={state.ui.snapSettings.guideSnap.enabled}
										label={
											state.ui.snapSettings.guideSnap.enabled
												? "Snap to guides on"
												: "Snap to guides off"
										}
										shortcut={getShortcutLabel(
											"toggleSnapEnabled",
											shortcutPlatform,
										)}
										detail="Alt reverses while dragging"
										onClick={() =>
											dispatch({
												type: "setSnapSettings",
												value: {
													guideSnap: {
														enabled: !state.ui.snapSettings.guideSnap.enabled,
														threshold:
															state.ui.snapSettings.guideSnap.threshold,
														power: state.ui.snapSettings.guideSnap.power,
														maxSpeedPxPerSecond:
															state.ui.snapSettings.guideSnap
																.maxSpeedPxPerSecond,
													},
												},
											})
										}
									/>
								</div>
							</div>
						</div>
					</nav>

					<main className="editor-workspace-shell relative min-h-0 overflow-hidden">
						{showStorageWarning && (
							<div
								className="editor-bg-subtle editor-border-subtle flex items-center justify-between border-b px-4 py-2 text-xs"
								style={{ position: "relative", zIndex: 10 }}
								role="alert"
							>
								<span className="editor-text-strong">
									Document is large (&gt;4 MB). Consider exporting and clearing
									unused data to avoid localStorage limits.
								</span>
								<button
									type="button"
									className="editor-text-muted ml-4 shrink-0 font-medium hover:opacity-70"
									aria-label="Dismiss storage warning"
									onClick={() => setShowStorageWarning(false)}
								>
									✕
								</button>
							</div>
						)}
						<Stage
							document={state.document}
							selectedId={state.selectedId}
							selectedIds={state.selectedIds}
							activePageId={state.activePageId}
							previewSticky={state.ui.previewSticky}
							animationPreview={state.ui.animationPreview}
							spacerVisibility={state.ui.spacerVisibility}
							showGridLanes={state.ui.showGridLanes}
							snapSettings={state.ui.snapSettings}
							onStageFocus={() => {
								if (
									state.selectedIds.length === 0 &&
									stageSelectableIds.length > 0
								) {
									dispatch({ type: "select", id: stageSelectableIds[0] });
								}
							}}
							onSelect={handleStageSelect}
							onSelectMany={(ids, mode) =>
								dispatch({ type: "selectMany", ids, mode })
							}
							onClearSelection={() => dispatch({ type: "clearSelection" })}
							onMove={(id, x, y) => {
								setLinkPopupVisible(false);
								dispatch({ type: "move", id, x, y });
							}}
							onMoveSelection={(moves) =>
								dispatch({ type: "moveSelection", moves })
							}
							onReparent={(id, parentId, x, y) =>
								dispatch({ type: "reparent", id, parentId, x, y })
							}
							onReparentSelection={(parentId, moves) =>
								dispatch({ type: "reparentSelection", parentId, moves })
							}
							onResize={(id, width, height) =>
								dispatch({ type: "resize", id, width, height })
							}
							onResizeStart={(id) => dispatch({ type: "beginResize", id })}
							onResizeEnd={(id) => dispatch({ type: "endResize", id })}
							onUpdateRichContent={(id, content) =>
								dispatch({ type: 'setRichContent', id, content })
							}
							onStickyGeometryChange={onStickyGeometryChange}
							followLinkPopup={
								linkPopupVisible && selectedLinkNode
									? {
											node: selectedLinkNode,
											document: state.document,
											onNavigateToPage: (pageId) => {
												dispatch({ type: "setActivePage", pageId });
												setLinkPopupVisible(false);
											},
											onScrollToAnchor: (nodeId) => {
												const el = window.document.querySelector(
													`[data-node-id="${nodeId}"]`,
												);
												el?.scrollIntoView({
													behavior: "smooth",
													block: "nearest",
												});
												setLinkPopupVisible(false);
											},
										}
									: null
							}
						/>
					</main>

					<Suspense fallback={null}>
						<EditorSidebar
							selectedNodes={selectedNodes}
							document={state.document}
							node={selectedNode}
							focusedMode={state.ui.focusedMode}
							inspectorCollapsed={state.ui.inspectorCollapsed}
							temporaryInspectorOpen={state.ui.temporaryInspectorOpen}
							showOrderControls={orderState.show}
							canOrderBack={orderState.canBack}
							canOrderForward={orderState.canForward}
							canSendToBack={orderState.canBack}
							canBringToFront={orderState.canForward}
							orderBackShortcut={getShortcutLabel(
								"orderBack",
								shortcutPlatform,
							)}
							orderForwardShortcut={getShortcutLabel(
								"orderForward",
								shortcutPlatform,
							)}
							sendToBackShortcut={getShortcutLabel(
								"orderSendToBack",
								shortcutPlatform,
							)}
							bringToFrontShortcut={getShortcutLabel(
								"orderBringToFront",
								shortcutPlatform,
							)}
							canSectionBack={sectionOrderState.canBack}
							canSectionForward={sectionOrderState.canForward}
							onOrderBack={() => dispatch({ type: "orderBack" })}
							onOrderForward={() => dispatch({ type: "orderForward" })}
							onSendToBack={() => dispatch({ type: "orderSendToBack" })}
							onBringToFront={() => dispatch({ type: "orderBringToFront" })}
							onSectionBack={() => dispatch({ type: "orderBack" })}
							onSectionForward={() => dispatch({ type: "orderForward" })}
							onAlignSelection={(mode) =>
								dispatch({
									type: "alignSelection",
									mode,
									rects: collectSelectionRects(),
								})
							}
							onDistributeSelection={(mode) =>
								dispatch({
									type: "distributeSelection",
									mode,
									rects: collectSelectionRects(),
								})
							}
							onBulkEdit={(operations) =>
								dispatch({ type: "bulkEdit", operations })
							}
							onTextChange={(field, value) =>
								dispatch({ type: "text", field, value })
							}
							onWrapperStyleChange={(field, value) =>
								dispatch({ type: "wrapperStyle", field, value })
							}
							onRectChange={(field, value) =>
								dispatch({ type: "rect", field, value })
							}
							onPromote={(role) => dispatch({ type: "promote", role })}
							onDemote={() => dispatch({ type: "demote" })}
							onStickyEnabled={(value) =>
								dispatch({ type: "stickyEnabled", value })
							}
							onStickyTarget={(value) =>
								dispatch({ type: "stickyTarget", value })
							}
							onStickyEdges={(value) =>
								dispatch({ type: "stickyEdges", value })
							}
							onStickyOffset={(value) =>
								dispatch({ type: "stickyOffset", value })
							}
							onStickyOffsetTop={(value) =>
								dispatch({ type: "stickyOffsetTop", value })
							}
							onStickyOffsetBottom={(value) =>
								dispatch({ type: "stickyOffsetBottom", value })
							}
							onStickyDurationMode={(value) =>
								dispatch({ type: "stickyDurationMode", value })
							}
							onStickyDuration={(value) =>
								dispatch({ type: "stickyDuration", value })
							}
							onStickyDurationTop={(value) =>
								dispatch({ type: "stickyDurationTop", value })
							}
							onStickyDurationBottom={(value) =>
								dispatch({ type: "stickyDurationBottom", value })
							}
							onStickyElevation={(value) =>
								dispatch({ type: "stickyElevation", value })
							}
							onStickyElevated={(value) =>
								dispatch({ type: "stickyElevated", value })
							}
							globalStickyElevation={globalStickyElevation}
							onSetNodeVisibility={(id, value) =>
								dispatch({ type: "setNodeVisibility", id, value })
							}
							onSetTopLevelWrapperVisibility={(
								pageId,
								nodeId,
								visibility,
								pageIds,
							) =>
								dispatch({
									type: "setTopLevelWrapperVisibility",
									pageId,
									nodeId,
									visibility,
									pageIds,
								})
							}
							showDebugInfo={state.ui.showDebugInfo}
							onSwitchTextSubtype={(nodeId, subtype) =>
								dispatch({ type: "switchTextSubtype", nodeId, subtype })
							}
							onEnterFocusedMode={(value) =>
								dispatch({ type: "setFocusedMode", value })
							}
							onOpenManageFonts={() => onManageFontsOpenChange(true)}
							onInspectorCollapsedChange={(value) =>
								dispatch({ type: "setInspectorCollapsed", value })
							}
							onTemporaryInspectorOpenChange={(value) =>
								dispatch({ type: "setTemporaryInspectorOpen", value })
							}
							activePageId={state.activePageId}
							onSetPageDisplayName={(pageId, displayName) =>
								dispatch({ type: "setPageDisplayName", pageId, displayName })
							}
							onSetPageLang={(pageId, lang) =>
								dispatch({ type: "setPageLang", pageId, lang })
							}
							onSetPageSlug={(pageId, slug) =>
								dispatch({ type: "setPageSlug", pageId, slug })
							}
							onSetPageVisibility={(pageId, visible) =>
								dispatch({ type: "setPageVisibility", pageId, visible })
							}
							onSetPageViewTransition={(pageId, transition) =>
								dispatch({ type: "setPageViewTransition", pageId, transition })
							}
							onOpenPageSettings={handleOpenCurrentPageSettings}
							onOpenPagesPanel={handleOpenPagesPanel}
							onSetPageParent={(pageId, parentPageId) =>
								dispatch({ type: "setPageParent", pageId, parentPageId })
							}
							onValidateLinks={handleOpenLinkValidation}
						/>
					</Suspense>
				</div>
			</div>

			{state.ui.focusedMode && selectedNodes.length > 0 ? (
				<div
					ref={focusedPanelRef}
					className="pointer-events-none absolute z-[340] w-[270px] max-w-[calc(100vw-40px)]"
					data-focused-panel-dragging={focusedPanelDragging ? "true" : "false"}
					style={{
						top: `${56 + FOCUSED_PANEL_TOP_OFFSET_PX}px`,
						right: `${focusedPanelRightOffsetPx}px`,
						transform: `translate(${focusedPanelOffsetDraft.x}px, ${focusedPanelOffsetDraft.y}px)`,
					}}
				>
					<FocusedModePanel
						document={state.document}
						selectedNodes={selectedNodes}
						node={selectedNode}
						focusedMode={state.ui.focusedMode}
						mode={state.ui.focusedMode}
						showOrderControls={orderState.show}
						canOrderBack={orderState.canBack}
						canOrderForward={orderState.canForward}
						canSendToBack={orderState.canBack}
						canBringToFront={orderState.canForward}
						orderBackShortcut={getShortcutLabel("orderBack", shortcutPlatform)}
						orderForwardShortcut={getShortcutLabel(
							"orderForward",
							shortcutPlatform,
						)}
						sendToBackShortcut={getShortcutLabel(
							"orderSendToBack",
							shortcutPlatform,
						)}
						bringToFrontShortcut={getShortcutLabel(
							"orderBringToFront",
							shortcutPlatform,
						)}
						canSectionBack={sectionOrderState.canBack}
						canSectionForward={sectionOrderState.canForward}
						onOrderBack={() => dispatch({ type: "orderBack" })}
						onOrderForward={() => dispatch({ type: "orderForward" })}
						onSendToBack={() => dispatch({ type: "orderSendToBack" })}
						onBringToFront={() => dispatch({ type: "orderBringToFront" })}
						onSectionBack={() => dispatch({ type: "orderBack" })}
						onSectionForward={() => dispatch({ type: "orderForward" })}
						onTextChange={(field, value) =>
							dispatch({ type: "text", field, value })
						}
						onWrapperStyleChange={(field, value) =>
							dispatch({ type: "wrapperStyle", field, value })
						}
						onRectChange={(field, value) =>
							dispatch({ type: "rect", field, value })
						}
						onPromote={(role) => dispatch({ type: "promote", role })}
						onDemote={() => dispatch({ type: "demote" })}
						onStickyEnabled={(value) =>
							dispatch({ type: "stickyEnabled", value })
						}
						onStickyTarget={(value) =>
							dispatch({ type: "stickyTarget", value })
						}
						onStickyEdges={(value) => dispatch({ type: "stickyEdges", value })}
						onStickyOffset={(value) =>
							dispatch({ type: "stickyOffset", value })
						}
						onStickyOffsetTop={(value) =>
							dispatch({ type: "stickyOffsetTop", value })
						}
						onStickyOffsetBottom={(value) =>
							dispatch({ type: "stickyOffsetBottom", value })
						}
						onStickyDurationMode={(value) =>
							dispatch({ type: "stickyDurationMode", value })
						}
						onStickyDuration={(value) =>
							dispatch({ type: "stickyDuration", value })
						}
						onStickyDurationTop={(value) =>
							dispatch({ type: "stickyDurationTop", value })
						}
						onStickyDurationBottom={(value) =>
							dispatch({ type: "stickyDurationBottom", value })
						}
						onStickyElevation={(value) =>
							dispatch({ type: "stickyElevation", value })
						}
						onStickyElevated={(value) =>
							dispatch({ type: "stickyElevated", value })
						}
						globalStickyElevation={globalStickyElevation}
						activePageId={state.activePageId}
						onSetNodeVisibility={(id, value) =>
							dispatch({ type: "setNodeVisibility", id, value })
						}
						onSetTopLevelWrapperVisibility={(
							pageId,
							nodeId,
							visibility,
							pageIds,
						) =>
							dispatch({
								type: "setTopLevelWrapperVisibility",
								pageId,
								nodeId,
								visibility,
								pageIds,
							})
						}
						onSwitchTextSubtype={(nodeId, subtype) =>
							dispatch({ type: "switchTextSubtype", nodeId, subtype })
						}
						onEnterFocusedMode={(value) =>
							dispatch({ type: "setFocusedMode", value })
						}
						onOpenManageFonts={() => onManageFontsOpenChange(true)}
						onExitFocusedMode={() =>
							dispatch({ type: "setFocusedMode", value: null })
						}
						onHeaderDragPointerDown={handleFocusedPanelDragStart}
						dragging={focusedPanelDragging}
					/>
				</div>
			) : null}

			<SectionTemplatePopover
				panelRef={sectionTemplatePanelRef}
				open={sectionTemplateOpen}
				style={{ top: "76px", left: "80px" }}
				onOpenChange={onSectionTemplateOpenChange}
				onClose={onCloseSectionTemplates}
				onInsertTemplate={(templateId) => {
					dispatch({ type: "insertSectionTemplate", templateId });
					onCloseSectionTemplates();
				}}
			/>

			<TextTypePopover
				panelRef={textTypePanelRef}
				open={textTypeOpen}
				style={{ top: "76px", left: "80px" }}
				onOpenChange={onTextTypeOpenChange}
				onClose={onCloseTextTypes}
				onInsert={(role) => {
					onInsertTextType(role);
					onCloseTextTypes();
				}}
			/>

			{layersOpen ? (
				<Suspense fallback={null}>
					<LayersPanel
						panelRef={layersPanelRef}
						open={layersOpen}
						position={layersPosition}
						document={state.document}
						activePageId={state.activePageId}
						selectedIds={state.selectedIds}
						onOpenChange={onLayersOpenChange}
						onPositionChange={onLayersPositionChange}
						onClose={onCloseLayers}
						onSelectNode={(id, mode) =>
							dispatch(
								mode === "toggle"
									? { type: "toggleSelect", id }
									: { type: "select", id },
							)
						}
						onRenameNode={(id, value) =>
							dispatch({ type: "text", field: "name", value, id })
						}
						onDeleteNode={(id) => dispatch({ type: "deleteNode", id })}
						onSetNodeVisibility={(id, value) =>
							dispatch({ type: "setNodeVisibility", id, value })
						}
						onSetTopLevelWrapperVisibility={(pageId, nodeId, visibility, pageIds) =>
							dispatch({
								type: "setTopLevelWrapperVisibility",
								pageId,
								nodeId,
								visibility,
								pageIds,
							})
						}
						onMoveNodeInTree={(id, targetParentId, targetIndex) =>
							dispatch({
								type: "moveNodeInTree",
								id,
								targetParentId,
								targetIndex,
							})
						}
					/>
				</Suspense>
			) : null}

			{pagesOpen ? (
				<Suspense fallback={null}>
					<PagesPanel
						panelRef={pagesPanelRef}
						position={pagesPosition}
						document={state.document}
						activePageId={state.activePageId}
						selectedPageId={requestedPageSettingsId}
						initialTab={pagesPanelTabTarget}
						onClose={() => {
							onPagesOpenChange(false);
							setRequestedPageSettingsId(null);
						}}
						onSetSiteSettings={(patch) =>
							dispatch({ type: "setSiteSettings", patch })
						}
						onSetActivePage={(pageId) =>
							dispatch({ type: "setActivePage", pageId })
						}
						onAddPage={() => dispatch({ type: "addPage" })}
						onDeletePage={(pageId) => dispatch({ type: "deletePage", pageId })}
						onSetPageDisplayName={(pageId, displayName) =>
							dispatch({ type: "setPageDisplayName", pageId, displayName })
						}
						onSetPageAsHome={(pageId) =>
							dispatch({ type: "setPageAsHome", pageId })
						}
						onSetPageLang={(pageId, lang) =>
							dispatch({ type: "setPageLang", pageId, lang })
						}
						onSetPageSlug={(pageId, slug) =>
							dispatch({ type: "setPageSlug", pageId, slug })
						}
						onAddPageAlias={(pageId, alias) =>
							dispatch({ type: "addPageSlugAlias", pageId, alias })
						}
						onRemovePageAlias={(pageId, alias) =>
							dispatch({ type: "removePageSlugAlias", pageId, alias })
						}
						onSyncPageLinks={(oldUrl, newUrl) =>
							dispatch({ type: "syncPageLinks", oldUrl, newUrl })
						}
						onValidateLinks={handleOpenLinkValidation}
						onSetPageVisibility={(pageId, visible) =>
							dispatch({ type: "setPageVisibility", pageId, visible })
						}
						onSetPageViewTransition={(pageId, transition) =>
							dispatch({ type: "setPageViewTransition", pageId, transition })
						}
						onSetPageParent={(pageId, parentPageId) =>
							dispatch({ type: "setPageParent", pageId, parentPageId })
						}
						onReorderPage={(pageId, direction) =>
							dispatch({ type: "reorderPage", pageId, direction })
						}
						onPositionChange={onPagesPositionChange}
					/>
				</Suspense>
			) : null}

			{settingsOpen ? (
				<PopoverSurface
					ref={settingsPanelRef}
					open={settingsOpen}
					onOpenChange={onSettingsOpenChange}
				>
					<Suspense fallback={null}>
						<SettingsPanel
							document={state.document}
							documentJson={documentJson}
							previewSticky={state.ui.previewSticky}
							spacerVisibility={state.ui.spacerVisibility}
							showGridLanes={state.ui.showGridLanes}
							snapSettings={state.ui.snapSettings}
							themeMode={state.ui.themeMode}
							accentColor={resolvedAccent}
							lightTheme={state.ui.lightTheme}
							darkTheme={state.ui.darkTheme}
							startupFocusedMode={state.ui.startupFocusedMode}
							resolvedTheme={resolvedTheme}
							undoDepth={historyState.past.length}
							redoDepth={historyState.future.length}
							historyLimit={historyState.historyLimit}
							onClose={() => onSettingsOpenChange(false)}
							onAddFont={handleAddDocumentFont}
							onRemoveFont={handleRemoveDocumentFont}
							onToggleFontFavorite={handleToggleDocumentFontFavorite}
							onPurgeUnusedFonts={handlePurgeUnusedFonts}
							animationPreview={state.ui.animationPreview}
							onAnimationPreviewChange={(value) =>
								dispatch({ type: "setAnimationPreview", value })
							}
							onPreviewStickyChange={(value) =>
								dispatch({ type: "setPreviewSticky", value })
							}
							onSpacerVisibilityChange={(value) =>
								dispatch({ type: "setSpacerVisibility", value })
							}
							showDebugInfo={state.ui.showDebugInfo}
							onShowGridLanesChange={(value) =>
								dispatch({ type: "setShowGridLanes", value })
							}
							onShowDebugInfoChange={(value) =>
								dispatch({ type: "setShowDebugInfo", value })
							}
							onSnapSettingsChange={(value) =>
								dispatch({ type: "setSnapSettings", value })
							}
							onThemeModeChange={(value) =>
								dispatch({ type: "setThemeMode", value })
							}
							onAccentColorChange={(value) =>
								dispatch({ type: "setAccentColor", value })
							}
							onLightThemeChange={(value) => {
								dispatch({ type: "setLightTheme", value });
								if (value === "paper") {
									dispatch({
										type: "setAccentColor",
										value: getAccentColorForLightThemeSelection(
											value,
											state.ui.accentColor,
										),
									});
								}
							}}
							onDarkThemeChange={(value) => {
								dispatch({ type: "setDarkTheme", value });
								if (value === "monokai") {
									dispatch({
										type: "setAccentColor",
										value: getAccentColorForDarkThemeSelection(
											value,
											state.ui.accentColor,
										),
									});
								}
							}}
							onStartupFocusedModeChange={(value) =>
								dispatch({ type: "setStartupFocusedMode", value })
							}
							onClearHistory={() => dispatch({ type: "clearHistory" })}
							onHistoryLimitChange={(value) =>
								dispatch({ type: "setHistoryLimit", value })
							}
							globalStickyElevation={globalStickyElevation}
							onStickyElevationChange={(value) =>
								dispatch({ type: "stickyElevation", value })
							}
							onImport={onImportDocument}
							onResetData={onResetData}
							onResetAll={onResetAll}
							onSiteSettingsChange={(patch) =>
								dispatch({ type: "setSiteSettings", patch })
							}
							linkErrors={linkValidationErrors}
							onValidateLinks={handleValidateLinks}
							activeSection={settingsSectionTarget}
						/>
					</Suspense>
				</PopoverSurface>
			) : null}

			<Dialog open={manageFontsOpen} onOpenChange={onManageFontsOpenChange}>
				<DialogContent
					showCloseButton={false}
					className="flex max-h-[min(84vh,820px)] max-w-[920px] min-h-0 flex-col overflow-hidden p-0"
				>
					<EditorPanelHeader
						icon={Type}
						title="Manage Fonts"
						description="Add, remove, favorite, and purge document fonts."
						closeLabel="Close manage fonts"
						onClose={() => onManageFontsOpenChange(false)}
					/>
					<div className="editor-scrollbar min-h-0 overflow-y-auto p-5 pt-4">
						<Suspense fallback={null}>
							<ManageFontsPanel
								document={state.document}
								onAddFont={handleAddDocumentFont}
								onRemoveFont={handleRemoveDocumentFont}
								onToggleFavorite={handleToggleDocumentFontFavorite}
								onPurgeUnused={handlePurgeUnusedFonts}
							/>
						</Suspense>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={Boolean(state.pendingRoleSwap)}
				onOpenChange={(open) => {
					if (!open) {
						dispatch({ type: "cancelPromote" });
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Replace current {state.pendingRoleSwap?.targetRole}?
						</DialogTitle>
						<DialogDescription>
							A {state.pendingRoleSwap?.targetRole} already exists. Demote the
							current one and promote this wrapper instead?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => dispatch({ type: "cancelPromote" })}
						>
							Cancel
						</Button>
						<Button onClick={() => dispatch({ type: "confirmPromote" })}>
							Replace
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<HelpDialog
				open={helpOpen}
				onOpenChange={onHelpOpenChange}
				initialEntryId={helpEntryTarget}
			/>
			<ShortcutsDialog
				open={shortcutsOpen}
				onOpenChange={onShortcutsOpenChange}
			/>
			<AboutDialog open={aboutOpen} onOpenChange={onAboutOpenChange} />
		</div>
	);
}
