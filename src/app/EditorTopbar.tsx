import { useMemo } from "react";
import {
	BookOpen,
	BookOpenText,
	ClipboardPaste,
	Copy,
	CopyPlus,
	Eye,
	FileDown,
	FileJson,
	FileUp,
	Info,
	Keyboard,
	Layers2,
	Palette,
	Redo2,
	Settings,
	Sparkles,
	SwatchBook,
	Trash2,
	Type,
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
import { openDesignSystemShowcase } from "@/lib/designSystem";
import type { ThemeMode } from "@/lib/theme";

const DOCUMENTATION_ENTRY_ID = "about";

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
	themeMode,
	accentColor,
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
	onOpenManageFonts,
	onOpenShortcuts,
	onOpenDocumentation,
	onOpenShowcaseTour,
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
	themeMode: ThemeMode;
	accentColor: string;
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
	onOpenManageFonts: () => void;
	onOpenShortcuts: () => void;
	onOpenDocumentation: (entryId: string) => void;
	onOpenShowcaseTour: () => void;
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
		<div className={topbarClass} role="toolbar" aria-label="Editor toolbar">
			<div className="editor-topbar-menubar-row">
				<img
					src="/sticky_512.png"
					alt=""
					className="h-8 w-8 shrink-0 object-contain"
				/>

				<Menubar className="min-w-0 flex-1">
					<MenubarMenu id="settings">
						<MenubarTrigger>Settings</MenubarTrigger>
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
							<MenubarItem
								icon={Settings}
								shortcut={getShortcutLabel("openSettings", shortcutPlatform)}
								onClick={() => onOpenSettingsSection("display")}
							>
								Open Settings
							</MenubarItem>
						</MenubarContent>
					</MenubarMenu>

					<MenubarMenu id="edit">
						<MenubarTrigger>Edit</MenubarTrigger>
						<MenubarContent>
							<MenubarItem
								icon={Undo2}
								shortcut={getShortcutLabel("undo", shortcutPlatform)}
								disabled={historyState.past.length === 0}
								onClick={onUndo}
							>
								Undo
							</MenubarItem>
							<MenubarItem
								icon={Redo2}
								shortcut={getShortcutLabel("redo", shortcutPlatform)}
								disabled={historyState.future.length === 0}
								onClick={onRedo}
							>
								Redo
							</MenubarItem>
							<MenubarSeparator />
							<MenubarItem icon={Copy} disabled>Copy</MenubarItem>
							<MenubarItem icon={CopyPlus} disabled>Duplicate</MenubarItem>
							<MenubarItem icon={ClipboardPaste} disabled>Paste</MenubarItem>
							<MenubarItem
								icon={Trash2}
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
							<MenubarSubmenu label="Theme" icon={Palette}>
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
								<MenubarSeparator />
								<MenubarPanelLinkItem
									icon={Settings}
									onClick={() => onOpenSettingsSection("display")}
								>
									Customize
								</MenubarPanelLinkItem>
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
								shortcut={getShortcutLabel(
									"toggleShowGridLanes",
									shortcutPlatform,
								)}
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
								shortcut={getShortcutLabel(
									"toggleShowDebugInfo",
									shortcutPlatform,
								)}
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
							<MenubarItem
								icon={Type}
								shortcut={getShortcutLabel(
									"toggleFontsPanel",
									shortcutPlatform,
								)}
								onClick={onOpenManageFonts}
							>
								Fonts Panel
							</MenubarItem>
							<MenubarCheckboxItem
								icon={Layers2}
								checked={layersOpen}
								shortcut={getShortcutLabel(
									"toggleComponentsPanel",
									shortcutPlatform,
								)}
								onCheckedChange={onToggleLayersPanel}
							>
								Components panel
							</MenubarCheckboxItem>
							<MenubarCheckboxItem
								icon={BookOpenText}
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
								icon={Keyboard}
								shortcut={getShortcutLabel(
									"showShortcutHelp",
									shortcutPlatform,
								)}
								onClick={onOpenShortcuts}
							>
								Shortcuts
							</MenubarItem>
							<MenubarPanelLinkItem
								icon={BookOpen}
								shortcut={getShortcutLabel(
									"openDocumentation",
									shortcutPlatform,
								)}
								onClick={() => onOpenDocumentation(DOCUMENTATION_ENTRY_ID)}
							>
								Documentation
							</MenubarPanelLinkItem>
							<MenubarPanelLinkItem
								icon={SwatchBook}
								onClick={() => {
									openDesignSystemShowcase({
										themeMode,
										accentColor,
										lightTheme,
										darkTheme,
									});
								}}
							>
								Design system showcase
							</MenubarPanelLinkItem>
							<MenubarPanelLinkItem
								icon={Sparkles}
								onClick={onOpenShowcaseTour}
							>
								Showcase tour
							</MenubarPanelLinkItem>
							<MenubarPanelLinkItem icon={Info} onClick={onOpenAbout}>
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
						shortcut={getShortcutLabel("openPreviewSite", shortcutPlatform)}
						className="editor-topbar-preview-button"
						onClick={onPreview}
					>
						<span className="hidden sm:inline">Preview</span>
					</TopbarIconAction>
				</div>
			</div>
		</div>
	);
}
