import { DARK_TOOLTIP_CLASS } from "@/lib/utils";
import { Layers2, Pin, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSwitcherSelect } from "@/components/ui/page-switcher-select";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
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
import { PopoverTooltip } from "@/components/ui/popover";
import { InlineNotice, NoticeSurface } from "@/components/ui/settings-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ResizeHandleView } from "../../../stage/stageRenderers/resizeHandles";
import { MultiSelectionOutline } from "../../../stage/stageRenderers/selectionVisuals";
import { ComponentPreview } from "../../previews/ComponentPreview";
import {
	ListCardDemo,
	OptionsSelectorDemo,
	PagerDemo,
	SwitchDemo,
} from "./MiscDemoComponents";
import {
	INPUT_PROPS,
	LIST_CARD_PROPS,
	MENUBAR_PROPS,
	OPTIONS_SELECTOR_PROPS,
	PAGER_PROPS,
	PAGE_SWITCHER_PROPS,
	SEARCHABLE_MULTI_SELECT_PROPS,
	SEARCHABLE_SELECT_PROPS,
	SELECTION_CHROME_PROPS,
	SWITCH_PROPS,
	TABS_PROPS,
	TEXTAREA_PROPS,
	TOOLTIP_PROPS,
	WARNING_INFO_PROPS,
} from "./MiscDemos.props";

// ---------------------------------------------------------------------------
// Demos
// ---------------------------------------------------------------------------

export function MiscDemos() {
	return (
		<>
			{/* Menubar */}
			<ComponentPreview
				id="base-menubar"
				name="Menubar"
				description="Reusable top-bar menu primitives for actions, toggles, submenus, panel links, and shortcut hints."
				sourceFile="src/components/ui/menubar.tsx"
				props={MENUBAR_PROPS}
			>
				<div className="editor-topbar rounded-xl border p-3">
					<Menubar>
						<MenubarMenu id="settings">
							<MenubarTrigger>Settings</MenubarTrigger>
							<MenubarContent>
								<MenubarItem shortcut="Cmd + ,">UI</MenubarItem>
								<MenubarItem>Fonts</MenubarItem>
							</MenubarContent>
						</MenubarMenu>
						<MenubarMenu id="view">
							<MenubarTrigger>View</MenubarTrigger>
							<MenubarContent>
								<MenubarSubmenu label="Theme">
									<MenubarItem>Customize</MenubarItem>
									<MenubarSeparator />
									<MenubarGroupLabel>Light</MenubarGroupLabel>
									<MenubarItem selected>Air</MenubarItem>
									<MenubarGroupLabel>Dark</MenubarGroupLabel>
									<MenubarItem>Ink</MenubarItem>
								</MenubarSubmenu>
								<MenubarCheckboxItem
									checked
									onCheckedChange={() => {}}
									shortcut="Shift + P"
								>
									Sticky preview
								</MenubarCheckboxItem>
								<MenubarToggleWithMoreItem
									checked={false}
									onCheckedChange={() => {}}
									onMore={() => {}}
									shortcut="Shift + G"
								>
									Snap
								</MenubarToggleWithMoreItem>
								<MenubarPanelLinkItem shortcut="Shift + L">
									Components panel
								</MenubarPanelLinkItem>
							</MenubarContent>
						</MenubarMenu>
					</Menubar>
				</div>
			</ComponentPreview>

			{/* Text Input */}
			<ComponentPreview
				id="base-page-switcher-select"
				name="Page Switcher Select"
				description="Shared page-switcher select built on top of the design-system Select primitives."
				sourceFile="src/components/ui/page-switcher-select.tsx"
				props={PAGE_SWITCHER_PROPS}
			>
				<div className="editor-topbar rounded-xl border p-3">
					<div className="editor-topbar-menubar-row">
						<PageSwitcherSelect
							value="home"
							options={[
								{ id: "home", label: "Home", depth: 0 },
								{ id: "about", label: "About", depth: 0 },
								{ id: "team", label: "Team", depth: 1 },
							]}
							onValueChange={() => {}}
							onCreatePage={() => {}}
						/>
					</div>
				</div>
			</ComponentPreview>

			<ComponentPreview
				id="base-tabs"
				name="Tabs"
				description="Compact reusable tabs for embedded editor panels such as the Pages panel."
				sourceFile="src/components/ui/tabs.tsx"
				props={TABS_PROPS}
			>
				<div className="max-w-[360px] space-y-3">
					<Tabs value="page">
						<TabsList variant="segmented">
							<TabsTrigger value="page" variant="segmented" size="compact">
								Page
							</TabsTrigger>
							<TabsTrigger value="settings" variant="segmented" size="compact">
								Settings
							</TabsTrigger>
						</TabsList>
						<TabsContent
							value="page"
							className="editor-border-subtle mt-3 rounded-lg border p-3 text-sm"
						>
							Embedded page editor content
						</TabsContent>
						<TabsContent
							value="settings"
							className="editor-border-subtle mt-3 rounded-lg border p-3 text-sm"
						>
							Site page settings
						</TabsContent>
					</Tabs>
				</div>
			</ComponentPreview>

			<ComponentPreview
				id="base-searchable-select"
				name="Searchable Select"
				description="Searchable fixed-option selector for site, page, and text language overrides."
				sourceFile="src/components/ui/searchable-select.tsx"
				props={SEARCHABLE_SELECT_PROPS}
			>
				<div className="max-w-[320px] space-y-3">
					<SearchableSelect
						value="en-US"
						options={[
							{ value: "__site__", label: "Site language" },
							{
								value: "en-US",
								label: "English (United States)",
								description: "en-US",
							},
							{ value: "fr", label: "French", description: "fr" },
							{ value: "he", label: "Hebrew", description: "he" },
						]}
						placeholder="Site language"
						searchPlaceholder="Search languages"
						onValueChange={() => {}}
					/>
				</div>
			</ComponentPreview>

			<ComponentPreview
				id="base-searchable-multi-select"
				name="Searchable Multi Select"
				description="Searchable multi-select menu for page targeting and other checklist-style dropdown workflows."
				sourceFile="src/components/ui/searchable-multi-select.tsx"
				props={SEARCHABLE_MULTI_SELECT_PROPS}
			>
				<div className="max-w-[320px] space-y-3">
					<SearchableMultiSelect
						values={["home", "about"]}
						options={[
							{ value: "home", label: "Home", description: "/home" },
							{ value: "about", label: "About", description: "/about" },
							{ value: "contact", label: "Contact", description: "/contact" },
						]}
						placeholder="Choose pages"
						searchPlaceholder="Search pages"
						onValuesChange={() => {}}
					/>
				</div>
			</ComponentPreview>

			<ComponentPreview
				id="base-input"
				name="Text Input"
				description="Text input with controlled value and draft management."
				sourceFile="src/components/ui/input.tsx"
				props={INPUT_PROPS}
			>
				<div className="max-w-[300px] space-y-3">
					<Input placeholder="Placeholder text…" />
					<Input value="Filled value" readOnly />
					<Input disabled placeholder="Disabled" />
				</div>
			</ComponentPreview>

			{/* Toggle (Switch) */}
			<ComponentPreview
				id="base-switch"
				name="Toggle (Switch)"
				description="Toggle switch based on Radix UI."
				sourceFile="src/components/ui/switch.tsx"
				props={SWITCH_PROPS}
			>
				<SwitchDemo />
			</ComponentPreview>

			{/* Options Selector */}
			<ComponentPreview
				id="base-options-selector"
				name="Options Selector"
				description="Segmented selector for mutually exclusive choices, with support for label buttons or icon-only buttons with per-option tooltips."
				sourceFile="src/components/ui/options-selector.tsx"
				props={OPTIONS_SELECTOR_PROPS}
			>
				<OptionsSelectorDemo />
			</ComponentPreview>

			{/* Text Field (Textarea) */}
			<ComponentPreview
				id="base-textarea"
				name="Text Field"
				description="Multi-line text input."
				sourceFile="src/components/ui/textarea.tsx"
				props={TEXTAREA_PROPS}
			>
				<div className="max-w-[300px] space-y-3">
					<Textarea placeholder="Enter multi-line text…" rows={3} />
					<Textarea disabled placeholder="Disabled" rows={3} />
					<div>
						<div className="editor-text-muted mb-1.5 text-[10px] font-medium uppercase tracking-wide">
							Multi-select (mixed)
						</div>
						<Textarea placeholder="-" rows={3} />
					</div>
				</div>
			</ComponentPreview>

			{/* Selection Chrome */}
			<ComponentPreview
				id="base-selection-chrome"
				name="Selection Chrome"
				description="On-stage selection outline, resize handles, and node label badge."
				sourceFile="src/stage/stageRenderers/resizeHandles.tsx"
				props={SELECTION_CHROME_PROPS}
			>
				<div className="flex flex-wrap gap-8">
					<div>
						<div className="editor-text-muted mb-6 text-[11px] font-medium">
							Single selection
						</div>
						<div className="relative" style={{ width: 180, height: 80 }}>
							<div className="stage-single-selection-label">Text</div>
							<div
								className="h-full w-full rounded-none"
								style={{ border: "2px solid var(--editor-accent)" }}
							/>
							<ResizeHandleView onHandleMouseDown={() => {}} />
						</div>
					</div>
					<div>
						<div className="editor-text-muted mb-6 text-[11px] font-medium">
							With indicators
						</div>
						<div className="relative" style={{ width: 180, height: 80 }}>
							<div className="stage-single-selection-label">
								Sticky Card
								<span className="stage-single-selection-label-badges">
									<Pin className="h-3 w-3" />
									<Rocket className="h-3 w-3" />
									<Layers2 className="h-3 w-3" />
								</span>
							</div>
							<div
								className="h-full w-full rounded-none"
								style={{ border: "2px solid var(--editor-accent)" }}
							/>
							<ResizeHandleView onHandleMouseDown={() => {}} />
						</div>
					</div>
					<div>
						<div className="editor-text-muted mb-6 text-[11px] font-medium">
							Section / header / footer
						</div>
						<div className="relative" style={{ width: 180, height: 80 }}>
							<div className="stage-single-selection-label">Section</div>
							<div
								className="h-full w-full rounded-none"
								style={{ border: "2px solid var(--editor-accent)" }}
							/>
							<ResizeHandleView
								handles={["s"]}
								wideSouthHandle
								onHandleMouseDown={() => {}}
							/>
						</div>
					</div>
					<div>
						<div className="editor-text-muted mb-6 text-[11px] font-medium">
							Section context
						</div>
						<div
							className="stage-wrapper subtype-section selected-context relative"
							style={{ width: 180, height: 80 }}
						>
							<div className="content-wrapper h-full w-full">
								<div
									className="wrapper-padding-overlay-boundary"
									style={{ top: 14, right: 18, bottom: 18, left: 18 }}
								/>
							</div>
						</div>
					</div>
					<div>
						<div className="editor-text-muted mb-6 text-[11px] font-medium">
							Multi selection
						</div>
						<div className="relative" style={{ width: 180, height: 80 }}>
							<MultiSelectionOutline
								bounds={{ left: 0, top: 0, width: 180, height: 80 }}
							/>
						</div>
					</div>
				</div>
			</ComponentPreview>

			{/* Warning / Info Message */}
			<ComponentPreview
				id="base-warning-info"
				name="Warning / Info Message"
				description="Shared notice surfaces for inspector and settings feedback, including compact inline warnings."
				sourceFile="src/components/ui/settings-panel.tsx"
				props={WARNING_INFO_PROPS}
			>
				<div className="max-w-[400px] space-y-4">
					<div>
						<div className="editor-text-muted mb-1 text-[11px] font-medium">
							NoticeSurface (info)
						</div>
						<NoticeSurface tone="info">
							Changes apply to the selected component only.
						</NoticeSurface>
					</div>
					<div>
						<div className="editor-text-muted mb-1 text-[11px] font-medium">
							NoticeSurface (warning)
						</div>
						<NoticeSurface tone="warning">
							Broken anchors remain visible until the target is restored.
						</NoticeSurface>
					</div>
					<div>
						<div className="editor-text-muted mb-1 text-[11px] font-medium">
							NoticeSurface (error)
						</div>
						<NoticeSurface tone="error">
							Failed to export document. File may be locked.
						</NoticeSurface>
					</div>
					<div>
						<div className="editor-text-muted mb-1 text-[11px] font-medium">
							NoticeSurface (danger alias)
						</div>
						<NoticeSurface tone="danger">
							Export validation failed.
						</NoticeSurface>
					</div>
					<div>
						<div className="editor-text-muted mb-1 text-[11px] font-medium">
							NoticeSurface (custom icon)
						</div>
						<NoticeSurface
							tone="info"
							icon={<Rocket className="h-3.5 w-3.5" />}
						>
							Animation settings are inherited from the preset.
						</NoticeSurface>
					</div>
					<div className="space-y-2">
						<div className="editor-text-muted mb-1 text-[11px] font-medium">
							InlineNotice variants
						</div>
						<InlineNotice tone="info">Uses the site language.</InlineNotice>
						<InlineNotice tone="warning">Broken anchor</InlineNotice>
						<InlineNotice tone="danger">Export validation failed</InlineNotice>
						<InlineNotice tone="error">Invalid export target</InlineNotice>
					</div>
				</div>
			</ComponentPreview>

			{/* Tooltip */}
			<ComponentPreview
				id="base-tooltip"
				name="Tooltip"
				description="PopoverTooltip using the native HTML Popover API for hover/focus tooltips."
				sourceFile="src/components/ui/popover.tsx"
				props={TOOLTIP_PROPS}
			>
				<div className="space-y-6">
					<div className="flex flex-wrap gap-6">
						<div>
							<div className="editor-text-muted mb-2 text-[11px] font-medium">
								Panel (rounded-xl)
							</div>
							<div
								className="editor-tooltip-panel ui-popover-tooltip rounded-xl border px-3 py-2 text-xs font-medium"
								style={{ width: "fit-content" }}
							>
								Tooltip content
							</div>
						</div>
						<div>
							<div className="editor-text-muted mb-2 text-[11px] font-medium">
								Inspector compact (rounded-md)
							</div>
							<div
								className={DARK_TOOLTIP_CLASS}
								style={{ width: "fit-content" }}
							>
								<div className="font-medium leading-3.5">Position Forward</div>
								<div className="mt-0.5 font-mono text-[10px] font-light opacity-70">
									Cmd+]
								</div>
							</div>
						</div>
						<div>
							<div className="editor-text-muted mb-2 text-[11px] font-medium">
								Info (rounded-lg)
							</div>
							<div
								className="editor-tooltip-panel w-48 rounded-lg border px-3 py-2 text-xs font-normal leading-5"
								style={{ width: "fit-content", maxWidth: 200 }}
							>
								Additional context about a setting or control.
							</div>
						</div>
						<div>
							<div className="editor-text-muted mb-2 text-[11px] font-medium">
								Topbar (dark)
							</div>
							<div
								className="editor-topbar-tooltip rounded-xl border px-3 py-2 text-xs font-medium"
								style={{ width: "fit-content" }}
							>
								Undo
								<div className="mt-0.5 font-mono text-[10px] font-light opacity-70">
									Cmd+Z
								</div>
							</div>
						</div>
					</div>
					<div>
						<div className="editor-text-muted mb-2 text-[11px] font-medium">
							Interactive
						</div>
						<div className="flex flex-wrap gap-4">
							<PopoverTooltip
								side="top"
								content={
									<div className="text-[11px] font-medium leading-4">
										Tooltip on top
									</div>
								}
							>
								<Button variant="outline" size="sm">
									Top
								</Button>
							</PopoverTooltip>
							<PopoverTooltip
								side="bottom"
								content={
									<div className="text-[11px] font-medium leading-4">
										Tooltip on bottom
									</div>
								}
							>
								<Button variant="outline" size="sm">
									Bottom
								</Button>
							</PopoverTooltip>
							<PopoverTooltip
								side="right"
								content={
									<div className="text-[11px] font-medium leading-4">
										Tooltip on right
									</div>
								}
							>
								<Button variant="outline" size="sm">
									Right
								</Button>
							</PopoverTooltip>
						</div>
					</div>
				</div>
			</ComponentPreview>

			{/* Pager */}
			<ComponentPreview
				id="base-list-card"
				name="List Card"
				description="Reusable card row with title, preview copy, meta slot, and trailing actions."
				sourceFile="src/components/ui/list-card.tsx"
				props={LIST_CARD_PROPS}
			>
				<ListCardDemo />
			</ComponentPreview>

			<ComponentPreview
				id="base-pager"
				name="Pager"
				description="Simple prev/next pagination pattern with page indicator, using outline buttons."
				sourceFile="src/components/ui/pager.tsx"
				props={PAGER_PROPS}
			>
				<PagerDemo />
			</ComponentPreview>
		</>
	);
}
