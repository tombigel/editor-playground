import type { ShowcaseTourConfig } from "@/api/showcaseTourApi";
import type {
	EditorNavigationUrlState,
	EditorPanelRequest,
} from "@/api/editorNavigationApi";
import { DESIGN_SYSTEM_EDITOR_ROUTE_HASH } from "@/lib/designSystem";

const editorState = (
	navigation: EditorNavigationUrlState = {},
): EditorNavigationUrlState => ({ focusedMode: null, ...navigation });

const closePanels = (): EditorPanelRequest[] => [{ type: "closeAll" }];

const openPanels = (
	...requests: EditorPanelRequest[]
): EditorPanelRequest[] => [{ type: "closeAll" }, ...requests];

const ensureStickyEdgeLab = () => ({
	templateId: "stickySteps" as const,
	ifMissingNodeName: "Sticky Edge Lab",
});

const PREVIEW_SITE_HREF = "#/preview";

export const SHOWCASE_TOUR_CONFIG: ShowcaseTourConfig = {
	entryTopicId: "start",
	entryStepId: "welcome",
	topics: [
		{
			id: "start",
			label: "Start Here",
			description: "Basic editor state and tour controls.",
			stepIds: ["welcome", "seeded-model", "menu-is-nonlinear", "ai-panel"],
		},
		{
			id: "sticky",
			label: "Sticky & Scroll",
			description: "Create a sticky lab, select a sticky card, then play.",
			stepIds: ["sticky-templates", "sticky-node", "sticky-guides", "edge-lab"],
		},
		{
			id: "editor",
			label: "Editor Craft",
			description: "Selection, structure, text, and focused editing.",
			stepIds: [
				"components-panel",
				"selection-sync",
				"direct-manipulation",
				"slate-text-editor",
				"focused-mode",
			],
		},
		{
			id: "api",
			label: "API & Architecture",
			description: "The headless model and API surface behind the editor.",
			stepIds: [
				"api-docs",
				"model-transfer",
				"site-preview-export",
				"debug-info",
			],
		},
		{
			id: "design",
			label: "Design System & Motion",
			description:
				"Tokenized chrome, font workflow, visual systems, and motion.",
			stepIds: [
				"ui-settings",
				"font-system",
				"design-system-route",
				"animation-preview",
			],
		},
		{
			id: "product",
			label: "Product Depth",
			description: "Pages, routing, validation, and docs.",
			stepIds: [
				"pages-panel",
				"page-routing",
				"link-validation",
				"docs-history",
			],
		},
	],
	steps: [
		{
			id: "welcome",
			topicId: "start",
			title: "Start with the editor",
			body: "This tour opens real editor surfaces. Use Next to follow the path, or open the menu to jump to a topic.",
			route: ["Stage", "Panels", "Preview", "Export"],
			anchor: {
				type: "selector",
				selector: ".stage-shell",
				label: "Live editor stage",
			},
			navigation: {
				editor: editorState({ activePageId: "page-home" }),
				panels: closePanels(),
			},
		},
		{
			id: "seeded-model",
			topicId: "start",
			title: "The stage uses document state",
			body: "The selected title is a document node. Templates, import/export, preview, and tests all use the same model, so editor flows can be scripted through the API.",
			route: [
				"API selects node",
				"Stage reflects selection",
				"Inspector follows",
			],
			anchor: {
				type: "selector",
				selector: ".stage-single-selection-overlay",
				label: "Selected model node",
			},
			navigation: {
				editor: editorState(),
				nodeTarget: { name: "Post Title", contentType: "text" },
				panels: closePanels(),
			},
		},
		{
			id: "menu-is-nonlinear",
			topicId: "start",
			title: "Jump to any topic",
			body: "The menu lets you skip around. Use it to inspect AI, sticky behavior, editor structure, API state, design-system surfaces, pages, or docs in any order.",
			route: ["Tour menu", "Topic", "Step"],
			anchor: { type: "tourMenu" },
			navigation: {
				editor: editorState(),
				panels: closePanels(),
			},
		},
		{
			id: "ai-panel",
			topicId: "start",
			title: "Open the AI assistant panel",
			body: "The AI panel is a limited MVP: a minimal harness and command set for asking about the current document and preparing reviewable edits. It currently supports only your own OpenRouter subscription, with the API key stored locally and sent directly to OpenRouter.",
			route: ["Left rail", "AI Assistant", "OpenRouter"],
			anchor: {
				type: "selector",
				selector: ".editor-ai-panel",
				label: "AI assistant MVP",
			},
			navigation: {
				editor: editorState({ panel: "ai" }),
				panels: openPanels({ type: "open", panel: "ai" }),
			},
			action: {
				type: "instruction",
				label:
					"Try it: add your OpenRouter key in Settings, then ask the assistant what it can inspect or draft.",
			},
		},
		{
			id: "sticky-templates",
			topicId: "sticky",
			title: "Create the sticky lab from the editor",
			body: "This step inserts the Sticky Edge Lab through the same editor action used by the template picker, then opens the template panel.",
			route: ["Left rail", "Templates", "Sticky Edge Lab"],
			anchor: {
				type: "selector",
				selector: '[data-panel-trigger="section-templates"]',
				label: "Template entry point",
			},
			navigation: {
				editor: editorState({ panel: "sectionTemplates" }),
				insertSectionTemplate: ensureStickyEdgeLab(),
				panels: openPanels({ type: "open", panel: "sectionTemplates" }),
			},
		},
		{
			id: "sticky-node",
			topicId: "sticky",
			title: "Select a sticky card and inspect the behavior",
			body: "The selected sticky card exposes its behavior in the inspector: edge, offset, duration, and elevation.",
			route: ["API selects sticky card", "Inspector", "Sticky behavior"],
			anchor: {
				type: "selector",
				selector: '[data-inspector-block="sticky-behavior"]',
				label: "Sticky controls",
			},
			navigation: {
				editor: editorState(),
				insertSectionTemplate: ensureStickyEdgeLab(),
				nodeTarget: {
					name: "Top Edge Card Container",
					sticky: true,
					selectable: true,
				},
				panels: closePanels(),
			},
		},
		{
			id: "sticky-guides",
			topicId: "sticky",
			title: "Turn on sticky preview and spacer guides",
			body: "Sticky preview applies the behavior on the stage. Spacer guides show the scroll distance that drives it.",
			route: ["View", "Sticky preview", "Show spacers"],
			anchor: {
				type: "selector",
				selector:
					'[aria-label="Sticky preview on"], [aria-label="Sticky preview off"]',
				label: "Preview toggle",
			},
			navigation: {
				editor: editorState({ previewSticky: true, spacerVisibility: "all" }),
				insertSectionTemplate: ensureStickyEdgeLab(),
				nodeTarget: {
					name: "Top Edge Card Container",
					sticky: true,
					selectable: true,
				},
				panels: closePanels(),
			},
			action: {
				type: "instruction",
				label:
					"Try it: scroll the stage, then change offset or duration in the sticky panel.",
			},
		},
		{
			id: "edge-lab",
			topicId: "sticky",
			title: "Compare top, both, and bottom edges",
			body: "The lab keeps the section and viewport fixed while changing the sticky edge definition. That makes edge cases easier to compare.",
			route: ["Sticky Edge Lab", "Top", "Both", "Bottom"],
			anchor: {
				type: "selector",
				selector: ".stage-single-selection-overlay",
				label: "Sticky edge case",
			},
			navigation: {
				editor: editorState(),
				insertSectionTemplate: ensureStickyEdgeLab(),
				nodeTarget: {
					name: "Bottom Edge Card Container",
					sticky: true,
					selectable: true,
				},
				panels: closePanels(),
			},
		},
		{
			id: "components-panel",
			topicId: "editor",
			title: "Structure stays visible while editing visually",
			body: "The Components panel shows hierarchy, visibility, and order while the stage stays available for direct manipulation.",
			route: ["Left rail", "Components"],
			anchor: {
				type: "selector",
				selector: ".editor-layers-panel",
				label: "Document hierarchy",
			},
			navigation: {
				editor: editorState({ panel: "components" }),
				panels: openPanels({ type: "open", panel: "components" }),
			},
		},
		{
			id: "selection-sync",
			topicId: "editor",
			title: "Stage and tree selection stay in sync",
			body: "Selection is shared by the stage, tree, inspector, keyboard shortcuts, and URL state.",
			route: ["Stage selection", "Components selection", "Inspector"],
			anchor: {
				type: "selector",
				selector: ".stage-single-selection-overlay",
				label: "Shared selection",
			},
			navigation: {
				editor: editorState({ panel: "components" }),
				panels: openPanels({ type: "open", panel: "components" }),
				nodeTarget: { visible: true, selectable: true },
			},
		},
		{
			id: "direct-manipulation",
			topicId: "editor",
			title: "Use the selection controls",
			body: "Handles, outlines, labels, focus behavior, and measurements expose the selected node in a form you can edit.",
			route: ["Canvas", "Selection overlay", "Inspector"],
			anchor: {
				type: "selector",
				selector: ".stage-single-selection-overlay",
				label: "Selection chrome",
			},
			navigation: {
				editor: editorState(),
				nodeTarget: { visible: true, selectable: true },
				panels: closePanels(),
			},
		},
		{
			id: "slate-text-editor",
			topicId: "editor",
			title: "Rich text editing",
			body: "The rich text editor is built on Slate. It supports formatted blocks, inline editing, merging sibling text nodes into one rich text node, and splitting multi-block rich text back into separate nodes.",
			route: ["Add", "Rich text", "Merge / split"],
			anchor: {
				type: "selector",
				selector: '[data-text-type-role="richtext"]',
				label: "Rich text option",
			},
			navigation: {
				editor: editorState({ panel: "textTypes" }),
				panels: openPanels({ type: "open", panel: "textTypes" }),
			},
			action: {
				type: "instruction",
				label:
					"Try it: insert rich text, edit it on the stage, then use merge/split from text selection workflows.",
			},
		},
		{
			id: "focused-mode",
			topicId: "editor",
			title: "Focus mode",
			body: "Focus mode narrows the editor to one task type. This step opens the design-focused panel for the selected node.",
			route: ["View", "Focus mode", "Design"],
			anchor: {
				type: "selector",
				selector: '[role="dialog"][aria-label="Design focus mode"]',
			},
			navigation: {
				editor: editorState({ focusedMode: "design" }),
				nodeTarget: { visible: true, selectable: true },
				panels: closePanels(),
			},
		},
		{
			id: "api-docs",
			topicId: "api",
			title: "Use the API without the UI",
			body: "The API docs list the document and navigation operations that can run without clicking through the editor.",
			route: ["Help", "Documentation", "API Reference"],
			anchor: {
				type: "selector",
				selector: '[data-help-entry="doc:docs/API.md"]',
				label: "API docs",
			},
			navigation: {
				editor: editorState({ panel: "help", helpEntryId: "doc:docs/API.md" }),
				panels: openPanels({
					type: "openHelpEntry",
					entryId: "doc:docs/API.md",
				}),
			},
		},
		{
			id: "model-transfer",
			topicId: "api",
			title: "The document can move through import/export",
			body: "Import/export uses portable JSON. The same document model can also render as a site bundle.",
			route: ["Settings", "Import / Export"],
			anchor: {
				type: "selector",
				selector: '[data-settings-nav="transfer"]',
				label: "Transfer workflow",
			},
			navigation: {
				editor: editorState({ panel: "settings", settingsSection: "transfer" }),
				panels: openPanels({
					type: "openSettingsSection",
					section: "transfer",
				}),
			},
		},
		{
			id: "site-preview-export",
			topicId: "api",
			title: "The editor model renders as a site",
			body: "Preview sends the current document model through the site renderer so you can inspect it as a page.",
			route: ["Top bar", "Preview"],
			anchor: {
				type: "selector",
				selector: '[aria-label="Preview site"]',
				label: "Preview site",
			},
			navigation: {
				editor: editorState(),
				panels: closePanels(),
			},
			action: {
				type: "externalLink",
				label: "Open preview in a new tab",
				href: PREVIEW_SITE_HREF,
			},
		},
		{
			id: "debug-info",
			topicId: "api",
			title: "Inspect debug state",
			body: "Debug info appears in the inspector so model, selection, sticky state, and render assumptions are visible while editing.",
			route: ["View", "Show debug info", "Inspector"],
			anchor: {
				type: "selector",
				selector: '[data-inspector-block="debug-info"]',
				label: "Debug state",
			},
			navigation: {
				editor: editorState({ showDebugInfo: true }),
				nodeTarget: { visible: true, selectable: true },
				panels: closePanels(),
			},
		},
		{
			id: "ui-settings",
			topicId: "design",
			title: "Theme and guide controls are productized",
			body: "Themes, guides, snap behavior, preview, and diagnostics are editable from the UI settings panel.",
			route: ["Settings", "UI"],
			anchor: {
				type: "selector",
				selector: '[data-settings-nav="display"]',
				label: "UI settings",
			},
			navigation: {
				editor: editorState({ panel: "settings", settingsSection: "display" }),
				panels: openPanels({ type: "openSettingsSection", section: "display" }),
			},
		},
		{
			id: "font-system",
			topicId: "design",
			title: "Choose document fonts",
			body: "The font panel lets each document choose Google Fonts, preview families and weights, and keep only the fonts it uses.",
			route: ["Settings", "Fonts"],
			anchor: {
				type: "selector",
				selector: '[data-settings-nav="fonts"]',
				label: "Font workflow",
			},
			navigation: {
				editor: editorState({ panel: "settings", settingsSection: "fonts" }),
				panels: openPanels({ type: "openSettingsSection", section: "fonts" }),
			},
		},
		{
			id: "design-system-route",
			topicId: "design",
			title: "The design system has its own verification surface",
			body: "The design-system route shows tokens, primitives, composites, panels, and editor chrome in one place.",
			route: ["Help", "Design system showcase"],
			anchor: {
				type: "selector",
				selector: '[data-ui="menubar-trigger"][data-menu-id="help"]',
				label: "Help menu",
			},
			navigation: {
				editor: editorState(),
				panels: closePanels(),
			},
			action: {
				type: "externalLink",
				label: "Open design system in a new tab",
				href: DESIGN_SYSTEM_EDITOR_ROUTE_HASH,
			},
		},
		{
			id: "animation-preview",
			topicId: "design",
			title: "Explore animations",
			body: "Animations are editable on the selected element. The inspector exposes trigger, preset, timing, reduced-motion, and preview controls in the same document workflow.",
			route: ["View", "Animation preview", "Inspector"],
			anchor: {
				type: "selector",
				selector: '[data-inspector-block="animation-behavior"]',
				label: "Animation controls",
			},
			navigation: {
				editor: editorState({ animationPreviewEnabled: true }),
				nodeTarget: { animatable: true, selectable: true },
				panels: closePanels(),
			},
		},
		{
			id: "pages-panel",
			topicId: "product",
			title: "This is a multi-page site editor",
			body: "The Pages panel manages pages, shared regions, visibility, and routing.",
			route: ["Left rail", "Pages"],
			anchor: {
				type: "selector",
				selector: ".editor-pages-panel",
				label: "Pages panel",
			},
			navigation: {
				editor: editorState({
					panel: "pages",
					pageTargetId: "page-home",
					pagesTab: "page",
				}),
				panels: openPanels({ type: "openPages", pageId: "page-home" }),
			},
		},
		{
			id: "page-routing",
			topicId: "product",
			title: "Routing details are explicit UX",
			body: "Page names, slugs, aliases, parent pages, and link sync are visible controls.",
			route: ["Pages", "Home", "Route controls"],
			anchor: {
				type: "selector",
				selector: '[data-page-row-id="page-home"]',
				label: "Home page route",
			},
			navigation: {
				editor: editorState({
					panel: "pages",
					pageTargetId: "page-home",
					pagesTab: "page",
				}),
				panels: openPanels({
					type: "openPages",
					pageId: "page-home",
					tab: "page",
				}),
			},
		},
		{
			id: "link-validation",
			topicId: "product",
			title: "Maintenance workflows are built in",
			body: "Validation helps find broken links before exporting or previewing the site.",
			route: ["Settings", "Import / Export", "Validate links"],
			anchor: {
				type: "selector",
				selector: '[data-settings-nav="transfer"]',
				label: "Validation workflow",
			},
			navigation: {
				editor: editorState({ panel: "settings", settingsSection: "transfer" }),
				panels: openPanels({
					type: "openSettingsSection",
					section: "transfer",
				}),
			},
		},
		{
			id: "docs-history",
			topicId: "product",
			title: "The work is documented as carefully as the UI",
			body: "Specs, API docs, style guidance, changelog, and implementation notes are available from Help.",
			route: ["Help", "Documentation", "Spec"],
			anchor: {
				type: "selector",
				selector: '[data-help-entry="doc:docs/PLAYGROUND_SPEC.md"]',
				label: "Product spec",
			},
			navigation: {
				editor: editorState({
					panel: "help",
					helpEntryId: "doc:docs/PLAYGROUND_SPEC.md",
				}),
				panels: openPanels({
					type: "openHelpEntry",
					entryId: "doc:docs/PLAYGROUND_SPEC.md",
				}),
			},
		},
	],
};
