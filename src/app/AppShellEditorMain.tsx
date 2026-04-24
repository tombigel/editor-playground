import { Suspense } from "react";
import { Ghost, Magnet, Play, ScanEye } from "lucide-react";
import { getShortcutLabel } from "@/lib/shortcuts";
import { INSPECTOR_TRANSITION_MS } from "../panels/inspectorLayout";
import { openPreviewSiteWindow } from "./previewWindow";
import { InsertPanel } from "../panels/InsertPanel";
import { Stage } from "../api/editorViewApi";
import { EditorSidebar } from "./AppShell.lazyPanels";
import { EditorTopbar } from "./EditorTopbar";
import { RailToggleButton, SpacerIcon } from "./AppChrome";

type AppShellEditorMainProps = {
	// The shell owns the state and handlers; this view helper keeps render ownership separate.
	// biome-ignore lint/suspicious/noExplicitAny: AppShell passes a local render context with many callback shapes.
	ctx: any;
};

export function AppShellEditorMain({ ctx }: AppShellEditorMainProps) {
	const {
		editorWindowId,
		linkPopupVisible,
		setHelpEntryTarget,
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
		layersOpen,
		pagesOpen,
		dispatch,
		onStickyGeometryChange,
		onOpenLayers,
		onLayersOpenChange,
		onCloseLayers,
		onOpenSectionTemplates,
		onOpenTextTypes,
		onManageFontsOpenChange,
		onHelpOpenChange,
		onShortcutsOpenChange,
		onAboutOpenChange,
		onPagesOpenChange,
		showStorageWarning,
		setShowStorageWarning,
		importInputRef,
		activateRichEditRef,
		globalStickyElevation,
		leftRailWidth,
		sidebarWidth,
		sidebarTransitionTiming,
		selectedLinkNode,
		setLinkPopupVisible,
		handleStageSelect,
		collectSelectionRects,
		handleOpenPagesPanel,
		handleOpenCurrentPageSettings,
		handleOpenLinkValidation,
		handleOpenSettingsSection,
		handleSetLightTheme,
		handleSetDarkTheme,
		handleImportJson,
		handleImportJsonFile,
		handleExportJson,
		handleExportSite,
	} = ctx;

	return (
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
					openPreviewSiteWindow(editorWindowId);
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
									icon={Ghost}
									pressed={state.ui.showHidden}
									label="Show Hidden"
									shortcut={getShortcutLabel(
										"toggleShowHidden",
										shortcutPlatform,
									)}
									onClick={() =>
										dispatch({
											type: "setShowHidden",
											value: !state.ui.showHidden,
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
													threshold: state.ui.snapSettings.guideSnap.threshold,
													power: state.ui.snapSettings.guideSnap.power,
													maxSpeedPxPerSecond:
														state.ui.snapSettings.guideSnap.maxSpeedPxPerSecond,
												},
											},
										})
									}
								/>
							</div>
						</div>
					</div>
				</nav>

				<div className="editor-workspace-shell relative min-h-0 overflow-hidden">
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
						showHidden={state.ui.showHidden}
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
						onUpdateTextDocumentContent={(id, content) =>
							dispatch({ type: "setTextDocumentContent", id, content })
						}
						onUpdateTextDocumentBlockGap={(id, value) =>
							dispatch({ type: "setTextDocumentBlockGap", id, value })
						}
						onRegisterActivateRichEdit={(fn) => {
							activateRichEditRef.current = fn;
						}}
						onOpenManageFonts={() => onManageFontsOpenChange(true)}
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
				</div>

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
						onMergeTextSelectionToRich={(nodeIds) =>
							dispatch({ type: "mergeTextSelectionToRich", nodeIds })
						}
						onEnterFocusedMode={(value) =>
							dispatch({ type: "setFocusedMode", value })
						}
						onActivateRichEdit={(nodeId) => activateRichEditRef.current(nodeId)}
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
	);
}
