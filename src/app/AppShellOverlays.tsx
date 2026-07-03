import { Suspense } from "react";
import { Type } from "lucide-react";
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
import { getShortcutLabel } from "@/lib/shortcuts";
import {
	getAccentColorForDarkThemeSelection,
	getAccentColorForLightThemeSelection,
} from "@/lib/theme";
import { FOCUSED_PANEL_TOP_OFFSET_PX } from "../editor/focusedPanelPosition";
import { AboutDialog } from "../panels/AboutDialog";
import { EditorPanelHeader } from "../panels/EditorPanelHeader";
import { FocusedModePanel } from "../panels/FocusedModePanel";
import { HelpDialog } from "../panels/HelpDialog";
import { ShortcutsDialog } from "../panels/ShortcutsDialog";
import {
	AiPanel,
	LayersPanel,
	ManageFontsPanel,
	PagesPanel,
	SettingsPanel,
} from "./AppShell.lazyPanels";
import { SectionTemplatePopover, TextTypePopover } from "./AppChrome";
import { openManageFontsWithOptions } from "./manageFontsActions";
import { ShowcaseTourOverlay } from "./showcaseTour/ShowcaseTourOverlay";
import { SHOWCASE_TOUR_CONFIG } from "./showcaseTour/showcaseTourConfig";

type AppShellOverlaysProps = {
	// The shell owns the state and handlers; this view helper keeps render ownership separate.
	// biome-ignore lint/suspicious/noExplicitAny: AppShell passes a local render context with many callback shapes.
	ctx: any;
};

export function AppShellOverlays({ ctx }: AppShellOverlaysProps) {
	const {
		sectionTemplateOpen,
		textTypeOpen,
		setRequestedPageSettingsId,
		setHelpEntryTarget,
		state,
		historyState,
		selectedNode,
		selectedNodes,
		orderState,
		sectionOrderState,
		resolvedTheme,
		shortcutPlatform,
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
		documentJson,
		dispatch,
		onLayersOpenChange,
		onLayersPositionChange,
		onPagesPositionChange,
		onCloseLayers,
		onAiOpenChange,
		onAiPositionChange,
		onCloseAi,
		onOpenAiSettings,
		onSectionTemplateOpenChange,
		onCloseSectionTemplates,
		onTextTypeOpenChange,
		onCloseTextTypes,
		onInsertTextType,
		onSettingsOpenChange,
		onManageFontsOpenChange,
		onHelpOpenChange,
		onShortcutsOpenChange,
		onAboutOpenChange,
		onPagesOpenChange,
		onImportDocument,
		onResetData,
		onResetAll,
		requestedPageSettingsId,
		pagesPanelTabTarget,
		settingsSectionTarget,
		helpEntryTarget,
		linkValidationErrors,
		activateRichEditRef,
		focusedPanelRef,
		focusedPanelOffsetDraft,
		focusedPanelDragging,
		focusedPanelRightOffsetPx,
		globalStickyElevation,
		resolvedAccent,
		handleFocusedPanelDragStart,
		handleAddDocumentFont,
		handleRemoveDocumentFont,
		handleToggleDocumentFontFavorite,
		handlePurgeUnusedFonts,
		handleValidateLinks,
		handleOpenLinkValidation,
		showcaseTourLocation,
		setShowcaseTourLocation,
		handleApplyShowcaseTourNavigation,
		handleCloseShowcaseTour,
	} = ctx;

	return (
		<>
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
						onContainerChildBoundaryChange={(value) =>
							dispatch({ type: "containerChildBoundary", value })
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
						onAnimationPresetChange={(trigger, preset, params) =>
							dispatch({ type: "animationPreset", trigger, preset, params })
						}
						onAnimationKeyframeChange={(trigger, effect) =>
							dispatch({
								type: "animationKeyframe",
								trigger,
								name: effect.name,
								keyframes: effect.keyframes,
								duration: effect.duration,
								easing: effect.easing,
							})
						}
						onAnimationOptionsChange={(options) =>
							dispatch({ type: "animationOptions", options })
						}
						onAnimationClear={() => dispatch({ type: "animationClear" })}
						onAnimationDocSettingsChange={(settings) =>
							dispatch({ type: "animationDocSettings", settings })
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
						onSwitchTextSubtype={(nodeId, subtype, conversionMode) =>
							dispatch({
								type: "switchTextSubtype",
								nodeId,
								subtype,
								conversionMode,
							})
						}
						onApplyTextNodeMarkdown={(nodeId, markdown) =>
							dispatch({ type: "applyTextNodeMarkdown", id: nodeId, markdown })
						}
						onSetTextDocumentContent={(nodeId, content) =>
							dispatch({ type: "setTextDocumentContent", id: nodeId, content })
						}
						onSetTextDocumentBlockGap={(nodeId, value) =>
							dispatch({ type: "setTextDocumentBlockGap", id: nodeId, value })
						}
						onEnterFocusedMode={(value) =>
							dispatch({ type: "setFocusedMode", value })
						}
						onActivateRichEdit={(nodeId) => activateRichEditRef.current(nodeId)}
						onOpenManageFonts={(options) =>
							openManageFontsWithOptions(onManageFontsOpenChange, options)
						}
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

			{aiOpen ? (
				<Suspense fallback={null}>
					<AiPanel
						panelRef={aiPanelRef}
						open={aiOpen}
						position={aiPosition}
						document={state.document}
						editorState={state}
						onOpenChange={onAiOpenChange}
						onPositionChange={onAiPositionChange}
						onClose={onCloseAi}
						onOpenSettings={onOpenAiSettings}
						onApplyAiCommands={(commands) =>
							dispatch({ type: "applyAiCommands", commands })
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
							showHidden={state.ui.showHidden}
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
							onShowHiddenChange={(value) =>
								dispatch({ type: "setShowHidden", value })
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
					<div className="editor-scrollbar editor-scrollbar-gutter min-h-0 overflow-y-auto p-5 pt-4">
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
			<AboutDialog
				open={aboutOpen}
				onOpenChange={onAboutOpenChange}
				onOpenDocumentation={(entryId) => {
					setHelpEntryTarget(entryId);
					onHelpOpenChange(true);
				}}
			/>
			{showcaseTourLocation ? (
				<ShowcaseTourOverlay
					config={SHOWCASE_TOUR_CONFIG}
					location={showcaseTourLocation}
					onLocationChange={setShowcaseTourLocation}
					onClose={handleCloseShowcaseTour}
					onApplyNavigation={handleApplyShowcaseTourNavigation}
				/>
			) : null}
		</>
	);
}
