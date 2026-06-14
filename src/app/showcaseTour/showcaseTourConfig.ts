import type { ShowcaseTourConfig } from "@/api/showcaseTourApi";
import type {
	EditorNavigationUrlState,
	EditorPanelRequest,
} from "@/api/editorNavigationApi";
import { DESIGN_SYSTEM_ROUTE_HASH } from "@/lib/designSystem";

const editorState = (
	navigation: EditorNavigationUrlState = {},
): EditorNavigationUrlState => ({ focusedMode: null, ...navigation });

const closePanels = (): EditorPanelRequest[] => [{ type: "closeAll" }];

const openPanels = (
	...requests: EditorPanelRequest[]
): EditorPanelRequest[] => [{ type: "closeAll" }, ...requests];

export const SHOWCASE_TOUR_CONFIG: ShowcaseTourConfig = {
	entryTopicId: "start",
	entryStepId: "welcome",
	topics: [
		{
			id: "start",
			label: "Start Here",
			description: "The product, model, and non-linear tour mechanics.",
			stepIds: ["welcome", "seeded-model", "menu-is-nonlinear"],
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
			description:
				"Selection, structure, progressive disclosure, and canvas UX.",
			stepIds: [
				"components-panel",
				"selection-sync",
				"direct-manipulation",
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
			description: "Pages, routing, validation, docs, and maintenance depth.",
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
			title: "This is the product, not a mockup",
			body: "Start with the stage: this is a working editor surface, not a slide. Use Next for the guided path, or open the tour menu when you want to jump by topic.",
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
			title: "The stage starts from a real document model",
			body: "The selected title is ordinary document state. The same model powers templates, import/export, preview rendering, and tests, which is why the editor can be scripted instead of manually driven.",
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
			title: "Jump by topic, follow your curiosity",
			body: "The tour is intentionally non-linear. A designer can jump to interaction craft, an engineer can jump to API and URL state, and a product lead can jump to documentation and maintenance workflows.",
			route: ["Tour menu", "Topic", "Step"],
			anchor: { type: "tourMenu" },
			navigation: {
				editor: editorState(),
				panels: closePanels(),
			},
		},
		{
			id: "sticky-templates",
			topicId: "sticky",
			title: "Create the sticky lab from the editor",
			body: "A sticky demo should not be hand-waved. This step inserts the Sticky Edge Lab through the same editor action the template picker uses, then opens the template surface so the route is visible.",
			route: ["Left rail", "Templates", "Sticky Edge Lab"],
			anchor: {
				type: "selector",
				selector: '[data-panel-trigger="section-templates"]',
				label: "Template entry point",
			},
			navigation: {
				editor: editorState({ panel: "sectionTemplates" }),
				insertSectionTemplate: {
					templateId: "stickySteps",
					ifMissingNodeName: "Sticky Edge Lab",
				},
				panels: openPanels({ type: "open", panel: "sectionTemplates" }),
			},
		},
		{
			id: "sticky-node",
			topicId: "sticky",
			title: "Select a sticky card and inspect the behavior",
			body: "Now the tour selects a real sticky card. The inspector is showing editable model state: edge, offset, duration, and elevation, not a screenshot annotation.",
			route: ["API selects sticky card", "Inspector", "Sticky behavior"],
			anchor: {
				type: "selector",
				selector: '[data-inspector-block="sticky-behavior"]',
				label: "Sticky controls",
			},
			navigation: {
				editor: editorState(),
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
			body: "This is where the experience becomes tangible. Sticky preview applies the behavior on the stage, and spacer guides reveal the invisible scroll distance. Scroll the stage, then tweak the sticky panel.",
			route: ["View", "Sticky preview", "Show spacers"],
			anchor: {
				type: "selector",
				selector:
					'[aria-label="Sticky preview on"], [aria-label="Sticky preview off"]',
				label: "Preview toggle",
			},
			navigation: {
				editor: editorState({ previewSticky: true, spacerVisibility: "all" }),
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
			body: "The lab keeps the variables controlled: same section, same viewport, different sticky edge definitions. It makes edge cases visible enough to design, test, and explain.",
			route: ["Sticky Edge Lab", "Top", "Both", "Bottom"],
			anchor: {
				type: "selector",
				selector: ".stage-single-selection-overlay",
				label: "Sticky edge case",
			},
			navigation: {
				editor: editorState(),
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
			body: "Visual editing needs a second view of structure. The Components panel lets a visitor see hierarchy, visibility, and order while the stage stays direct-manipulation friendly.",
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
			body: "The selected node is one concept shared by the stage, tree, inspector, keyboard shortcuts, and URL state. That agreement is what makes the editor feel coherent.",
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
			title: "Selection chrome is an editor surface",
			body: "Handles, outlines, labels, focus behavior, and measurements are product UX. They turn raw model state into something a person can confidently manipulate.",
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
			id: "focused-mode",
			topicId: "editor",
			title: "Progressive disclosure for deep work",
			body: "Focused mode narrows the interface to the task at hand. It feels like a different workflow, but it still runs the same editor API operations under the hood.",
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
			title: "The UI is not the only way to use the product",
			body: "The API docs are part of the product promise: important editor movement and document changes can be expressed without clicking through the UI.",
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
			body: "Import/export is a trust feature. The model is portable JSON, and the same document can become a rendered site bundle.",
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
			body: "Preview is the bridge from editor model to site renderer. It is deliberately one click away because the product is about authoring behavior, then seeing it as a real page.",
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
		},
		{
			id: "debug-info",
			topicId: "api",
			title: "Debug state is product tooling",
			body: "Debug info is surfaced in the inspector so the model, selection, sticky state, and render assumptions are inspectable during real work.",
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
			body: "The editor chrome is configurable without becoming arbitrary. Themes, guides, snap behavior, preview, and diagnostics are exposed as product controls.",
			route: ["Settings", "UI"],
			anchor: {
				type: "selector",
				selector: '[data-showcase-tour-anchor="settings-panel"]',
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
			title: "Fonts are document-level workflow",
			body: "Fonts are part of the document workflow. Favorites, usage, and cleanup live with the site instead of being hidden as incidental styling.",
			route: ["Settings", "Fonts"],
			anchor: {
				type: "selector",
				selector: '[data-settings-section="fonts"]',
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
			body: "The design system is not just documentation. It is a living verification surface for tokens, primitives, composites, panels, and editor chrome.",
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
				href: DESIGN_SYSTEM_ROUTE_HASH,
			},
		},
		{
			id: "animation-preview",
			topicId: "design",
			title: "Motion is an editor workflow",
			body: "Animation is treated as editable product state. Preview lets motion become something to tune, test, and explain instead of a hidden implementation detail.",
			route: ["View", "Animation preview", "Inspector"],
			anchor: {
				type: "selector",
				selector: '[data-inspector-block="animation"]',
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
			body: "Pages, shared regions, visibility, and routing move the playground beyond a canvas demo and toward a real site authoring tool.",
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
			body: "Page names, slugs, aliases, parent pages, and link sync are visible controls. Routing is treated as UX, not as a deployment afterthought.",
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
			body: "Validation and transfer workflows make long-lived documents safer to evolve. The editor helps find broken links before the site leaves the tool.",
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
			body: "Specs, API docs, style guidance, changelog, and implementation notes are part of the product craft. The documentation tells the same story as the interface.",
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
