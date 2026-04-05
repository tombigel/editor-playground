import { useMemo } from "react";
import {
	Eye,
	FileDown,
	FileJson,
	FileUp,
	Redo2,
	Settings,
	Undo2,
} from "lucide-react";
import { PageSwitcherSelect } from "@/components/ui/page-switcher-select";
import {
	Menubar,
	MenubarCheckboxItem,
	MenubarContent,
	MenubarGroupLabel,
	MenubarItem,
	MenubarMenu,
	MenubarPanelLinkItem,
	MenubarSeparator,
	MenubarSubmenu,
	MenubarToggleWithMoreItem,
	MenubarTrigger,
} from "@/components/ui/menubar";
import { TopbarIconAction } from "./AppChrome";
import { getShortcutLabel, type ShortcutPlatform } from "@/lib/shortcuts";
import {
	EDITOR_DARK_THEME_OPTIONS,
	EDITOR_LIGHT_THEME_OPTIONS,
	type EditorDarkTheme,
	type EditorLightTheme,
} from "@/lib/theme";
import type { DocumentPage, PageId } from "@/api/editorApi";
import type { FocusedMode } from "@/editor/types";

const DOCUMENTATION_ENTRY_ID = "doc:docs/PLAYGROUND_SPEC.md";

function getPageDepth(pages: DocumentPage[], page: DocumentPage) {
	let depth = 0;
	let current = page;
	while (current.parentPageId) {
		const parent = pages.find(
			(candidate) => candidate.id === current.parentPageId,
		);
		if (!parent) {
			break;
		}
		depth += 1;
		current = parent;
		if (depth > 8) {
			break;
		}
	}
	return depth;
}

export function EditorTopbar({
	topbarClass,
	shortcutPlatform,
	pages,
	activePageId,
	previewSticky,
	animationPreviewEnabled,
	spacerVisibility,
	showGridLanes,
	snapEnabled,
	showDebugInfo,
	focusedMode,
	resolvedTheme,
	lightTheme,
	darkTheme,
	historyState,
	canDeleteSelection,
	layersOpen,
	pagesOpen,
	onSetActivePage,
	onAddPage,
	onUndo,
	onRedo,
	onPreview,
	onImportJson,
	onExportJson,
	onExportSite,
	onOpenSettingsSection,
	onDeleteSelection,
	onSetLightTheme,
	onSetDarkTheme,
	onTogglePreviewSticky,
	onToggleAnimationPreview,
	onToggleSpacerVisibility,
	onToggleShowGridLanes,
	onToggleSnapEnabled,
	onOpenSnapSettings,
	onToggleShowDebugInfo,
	onSetFocusedMode,
	onToggleLayersPanel,
	onTogglePagesPanel,
	onOpenShortcuts,
	onOpenDocumentation,
	onOpenAbout,
}: {
	topbarClass: string;
	shortcutPlatform: ShortcutPlatform;
	pages: DocumentPage[];
	activePageId: PageId | null;
	previewSticky: boolean;
	animationPreviewEnabled: boolean;
	spacerVisibility: "selected" | "all";
	showGridLanes: boolean;
	snapEnabled: boolean;
	showDebugInfo: boolean;
	focusedMode: FocusedMode;
	resolvedTheme: "light" | "dark";
	lightTheme: EditorLightTheme;
	darkTheme: EditorDarkTheme;
	historyState: { past: unknown[]; future: unknown[] };
	canDeleteSelection: boolean;
	layersOpen: boolean;
	pagesOpen: boolean;
	onSetActivePage: (pageId: PageId) => void;
	onAddPage: () => void;
	onUndo: () => void;
	onRedo: () => void;
	onPreview: () => void;
	onImportJson: () => void;
	onExportJson: () => void;
	onExportSite: () => void;
	onOpenSettingsSection: (
		section: "display" | "defaults" | "fonts" | "advanced",
	) => void;
	onDeleteSelection: () => void;
	onSetLightTheme: (theme: EditorLightTheme) => void;
	onSetDarkTheme: (theme: EditorDarkTheme) => void;
	onTogglePreviewSticky: () => void;
	onToggleAnimationPreview: () => void;
	onToggleSpacerVisibility: () => void;
	onToggleShowGridLanes: () => void;
	onToggleSnapEnabled: () => void;
	onOpenSnapSettings: () => void;
	onToggleShowDebugInfo: () => void;
	onSetFocusedMode: (mode: FocusedMode) => void;
	onToggleLayersPanel: () => void;
	onTogglePagesPanel: () => void;
	onOpenShortcuts: () => void;
	onOpenDocumentation: (entryId: string) => void;
	onOpenAbout: () => void;
}) {
	const activePage =
		pages.find((page) => page.id === activePageId) ?? pages[0] ?? null;
	const pageOptions = useMemo(
		() =>
			pages.map((page) => ({
				id: page.id,
				label: page.displayName || "Untitled",
				depth: getPageDepth(pages, page),
			})),
		[pages],
	);

	return (
		<header className={topbarClass}>
			<div className="editor-topbar-menubar-row">
				<img
					src="/sticky_512.png"
					alt=""
					className="h-8 w-8 shrink-0 object-contain"
				/>

				<Menubar className="min-w-0 flex-1">
					<MenubarMenu id="settings">
						<MenubarTrigger icon={Settings}>Settings</MenubarTrigger>
						<MenubarContent>
							<MenubarItem icon={FileUp} onClick={onImportJson}>
								Import JSON
							</MenubarItem>
							<MenubarItem icon={FileJson} onClick={onExportJson}>
								Export JSON
							</MenubarItem>
							<MenubarItem icon={FileDown} onClick={onExportSite}>
								Export site
							</MenubarItem>
							<MenubarSeparator />
							<MenubarPanelLinkItem
								onClick={() => onOpenSettingsSection("display")}
							>
								UI
							</MenubarPanelLinkItem>
							<MenubarPanelLinkItem
								onClick={() => onOpenSettingsSection("defaults")}
							>
								Defaults
							</MenubarPanelLinkItem>
							<MenubarPanelLinkItem
								onClick={() => onOpenSettingsSection("fonts")}
							>
								Fonts
							</MenubarPanelLinkItem>
							<MenubarPanelLinkItem
								onClick={() => onOpenSettingsSection("advanced")}
							>
								Advanced
							</MenubarPanelLinkItem>
						</MenubarContent>
					</MenubarMenu>

					<MenubarMenu id="edit">
						<MenubarTrigger>Edit</MenubarTrigger>
						<MenubarContent>
							<MenubarItem
								shortcut={getShortcutLabel("undo", shortcutPlatform)}
								disabled={historyState.past.length === 0}
								onClick={onUndo}
							>
								Undo
							</MenubarItem>
							<MenubarItem
								shortcut={getShortcutLabel("redo", shortcutPlatform)}
								disabled={historyState.future.length === 0}
								onClick={onRedo}
							>
								Redo
							</MenubarItem>
							<MenubarSeparator />
							<MenubarItem disabled>Copy</MenubarItem>
							<MenubarItem disabled>Duplicate</MenubarItem>
							<MenubarItem disabled>Paste</MenubarItem>
							<MenubarItem
								shortcut={getShortcutLabel("deleteSelection", shortcutPlatform)}
								disabled={!canDeleteSelection}
								onClick={onDeleteSelection}
							>
								Delete
							</MenubarItem>
						</MenubarContent>
					</MenubarMenu>

					<MenubarMenu id="view">
						<MenubarTrigger>View</MenubarTrigger>
						<MenubarContent>
							<MenubarSubmenu label="Theme">
								<MenubarPanelLinkItem
									onClick={() => onOpenSettingsSection("display")}
								>
									Customize
								</MenubarPanelLinkItem>
								<MenubarSeparator />
								<MenubarGroupLabel>Light</MenubarGroupLabel>
								{EDITOR_LIGHT_THEME_OPTIONS.map((option) => (
									<MenubarItem
										key={option.value}
										selected={
											resolvedTheme === "light" && lightTheme === option.value
										}
										onClick={() => onSetLightTheme(option.value)}
									>
										{option.label}
									</MenubarItem>
								))}
								<MenubarSeparator />
								<MenubarGroupLabel>Dark</MenubarGroupLabel>
								{EDITOR_DARK_THEME_OPTIONS.map((option) => (
									<MenubarItem
										key={option.value}
										selected={
											resolvedTheme === "dark" && darkTheme === option.value
										}
										onClick={() => onSetDarkTheme(option.value)}
									>
										{option.label}
									</MenubarItem>
								))}
							</MenubarSubmenu>
							<MenubarSeparator />
							<MenubarCheckboxItem
								checked={previewSticky}
								shortcut={getShortcutLabel(
									"togglePreviewSticky",
									shortcutPlatform,
								)}
								onCheckedChange={onTogglePreviewSticky}
							>
								Sticky preview
							</MenubarCheckboxItem>
							<MenubarCheckboxItem
								checked={animationPreviewEnabled}
								shortcut={getShortcutLabel(
									"toggleAnimationPreview",
									shortcutPlatform,
								)}
								onCheckedChange={onToggleAnimationPreview}
							>
								Animation preview
							</MenubarCheckboxItem>
							<MenubarCheckboxItem
								checked={spacerVisibility === "all"}
								shortcut={getShortcutLabel(
									"toggleSpacerVisibility",
									shortcutPlatform,
								)}
								onCheckedChange={onToggleSpacerVisibility}
							>
								Show spacers
							</MenubarCheckboxItem>
							<MenubarCheckboxItem
								checked={showGridLanes}
								onCheckedChange={onToggleShowGridLanes}
							>
								Show grid
							</MenubarCheckboxItem>
							<MenubarToggleWithMoreItem
								checked={snapEnabled}
								shortcut={getShortcutLabel(
									"toggleSnapEnabled",
									shortcutPlatform,
								)}
								onCheckedChange={onToggleSnapEnabled}
								onMore={onOpenSnapSettings}
							>
								Snap
							</MenubarToggleWithMoreItem>
							<MenubarCheckboxItem
								checked={showDebugInfo}
								onCheckedChange={onToggleShowDebugInfo}
							>
								Show debug info
							</MenubarCheckboxItem>
							<MenubarSubmenu label="Focus mode">
								{[
									["None", null],
									["Layout", "layout"],
									["Content", "content"],
									["Design", "design"],
									["Sticky", "sticky"],
								].map(([label, value]) => (
									<MenubarItem
										key={label}
										selected={focusedMode === value}
										onClick={() => onSetFocusedMode(value as FocusedMode)}
									>
										{label}
									</MenubarItem>
								))}
							</MenubarSubmenu>
							<MenubarSeparator />
							<MenubarCheckboxItem
								checked={layersOpen}
								shortcut={getShortcutLabel(
									"toggleLayersPanel",
									shortcutPlatform,
								)}
								onCheckedChange={onToggleLayersPanel}
							>
								Components panel
							</MenubarCheckboxItem>
							<MenubarCheckboxItem
								checked={pagesOpen}
								shortcut={getShortcutLabel(
									"togglePagesPanel",
									shortcutPlatform,
								)}
								onCheckedChange={onTogglePagesPanel}
							>
								Pages panel
							</MenubarCheckboxItem>
						</MenubarContent>
					</MenubarMenu>

					<MenubarMenu id="pages">
						<MenubarTrigger>Pages</MenubarTrigger>
						<MenubarContent>
							<MenubarItem onClick={onAddPage}>New page</MenubarItem>
							<MenubarCheckboxItem
								checked={pagesOpen}
								shortcut={getShortcutLabel(
									"togglePagesPanel",
									shortcutPlatform,
								)}
								onCheckedChange={onTogglePagesPanel}
							>
								Pages panel
							</MenubarCheckboxItem>
						</MenubarContent>
					</MenubarMenu>

					<MenubarMenu id="help">
						<MenubarTrigger>Help</MenubarTrigger>
						<MenubarContent>
							<MenubarItem
								shortcut={getShortcutLabel(
									"showShortcutHelp",
									shortcutPlatform,
								)}
								onClick={onOpenShortcuts}
							>
								Shortcuts
							</MenubarItem>
							<MenubarPanelLinkItem
								onClick={() => onOpenDocumentation(DOCUMENTATION_ENTRY_ID)}
							>
								Documentation
							</MenubarPanelLinkItem>
							<MenubarPanelLinkItem
								onClick={() => {
									window.location.hash = "/design-system";
								}}
							>
								Design system showcase
							</MenubarPanelLinkItem>
							<MenubarPanelLinkItem onClick={onOpenAbout}>
								About
							</MenubarPanelLinkItem>
						</MenubarContent>
					</MenubarMenu>
				</Menubar>

				{activePage ? (
					<PageSwitcherSelect
						value={activePage.id}
						options={pageOptions}
						onValueChange={onSetActivePage}
						onCreatePage={onAddPage}
						triggerClassName="editor-topbar-page-switcher-centered"
					/>
				) : null}

				<div className="editor-topbar-actions ml-auto flex items-center gap-2">
					<TopbarIconAction
						icon={Undo2}
						label="Undo"
						shortcut={getShortcutLabel("undo", shortcutPlatform)}
						disabled={historyState.past.length === 0}
						onClick={onUndo}
					/>
					<TopbarIconAction
						icon={Redo2}
						label="Redo"
						shortcut={getShortcutLabel("redo", shortcutPlatform)}
						disabled={historyState.future.length === 0}
						onClick={onRedo}
					/>
					<TopbarIconAction
						icon={Eye}
						label="Preview site"
						className="editor-topbar-preview-button"
						onClick={onPreview}
					>
						<span className="hidden sm:inline">Preview</span>
					</TopbarIconAction>
				</div>
			</div>
		</header>
	);
}
