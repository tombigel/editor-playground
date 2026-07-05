import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInitialState, insertLeaf } from "../../api/editorApi";
import { AppShell } from "../AppShell";
import { LayersPanel } from "../../panels/LayersPanel";
import { LOCAL_STORAGE_WARNING_THRESHOLD_BYTES } from "../../editor/editorPersistence";
import {
	INSPECTOR_COLLAPSED_WIDTH_PX,
	INSPECTOR_EXPANDED_WIDTH_PX,
} from "../../panels/inspectorLayout";

function createProps(): ComponentProps<typeof AppShell> {
	const state = createInitialState();

	return {
		state,
		historyState: {
			past: [],
			future: [],
			historyLimit: 100,
		},
		selectedNode: null,
		selectedNodes: [],
		orderState: { show: false, canBack: false, canForward: false },
		sectionOrderState: { canBack: false, canForward: false },
		resolvedTheme: "light",
		shortcutPlatform: "mac",
		topbarClass: "editor-topbar",
		stageSelectableIds: [],
		settingsOpen: false,
		helpOpen: false,
		sectionTemplateOpen: false,
		textTypeOpen: false,
		mediaTypeOpen: false,
		settingsPanelRef: null,
		sectionTemplatePanelRef: null,
		textTypePanelRef: null,
		mediaTypePanelRef: null,
		documentJson: "{}",
		dispatch: () => undefined,
		onStickyGeometryChange: () => undefined,
		onOpenSectionTemplates: () => undefined,
		onSectionTemplateOpenChange: () => undefined,
		onCloseSectionTemplates: () => undefined,
		onOpenTextTypes: () => undefined,
		onTextTypeOpenChange: () => undefined,
		onCloseTextTypes: () => undefined,
		onInsertTextType: () => undefined,
		onOpenMediaTypes: () => undefined,
		onMediaTypeOpenChange: () => undefined,
		onCloseMediaTypes: () => undefined,
		onInsertMediaType: () => undefined,
		onSettingsOpenChange: () => undefined,
		onHelpOpenChange: () => undefined,
		onImportDocument: async () => ({ ok: true, message: "Imported." }),
		onResetData: () => undefined,
		onResetAll: () => undefined,
		onCopySelection: () => undefined,
		onPasteClipboard: () => undefined,
		onDuplicateSelection: () => undefined,
	};
}

describe("app/AppShell", () => {
	it("injects exported site css into preview mode", () => {
		vi.stubGlobal("window", {
			location: { origin: "http://localhost", pathname: "/" },
			localStorage: { getItem: () => null, setItem: () => undefined },
		});

		try {
			const markup = renderToStaticMarkup(<AppShell {...createProps()} appMode="preview" />);

			expect(markup).toContain('data-preview-site-css="true"');
			expect(markup).toContain(".sp-site");
			expect(markup).toContain("Back to Editor");
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it("renders the editor accent and dark theme on the shell container", () => {
		const props = createProps();
		props.state.ui.accentColor = "#ff6b4a";
		props.state.ui.lightTheme = "midday";
		props.state.ui.darkTheme = "ink";

		const markup = renderToStaticMarkup(<AppShell {...props} />);

		expect(markup).toContain('data-editor-dark-theme="ink"');
		expect(markup).toContain('data-editor-light-theme="midday"');
		expect(markup).toContain("--editor-accent:#ff6b4a");
	});

	it("uses the shared accent for paper and monokai shells", () => {
		const paperProps = createProps();
		paperProps.state.ui.accentColor = "#b07a3a";
		paperProps.state.ui.lightTheme = "paper";
		paperProps.resolvedTheme = "light";

		const paperMarkup = renderToStaticMarkup(<AppShell {...paperProps} />);

		expect(paperMarkup).toContain("--editor-accent:#b07a3a");

		const monokaiProps = createProps();
		monokaiProps.state.ui.accentColor = "#ff4f9a";
		monokaiProps.state.ui.darkTheme = "monokai";
		monokaiProps.resolvedTheme = "dark";

		const monokaiMarkup = renderToStaticMarkup(<AppShell {...monokaiProps} />);

		expect(monokaiMarkup).toContain("--editor-accent:#ff4f9a");
	});

	it("renders the left rail with smaller buttons and a stronger add label", () => {
		const markup = renderToStaticMarkup(<AppShell {...createProps()} />);

		expect(markup).toContain(
			`grid-template-columns:${INSPECTOR_COLLAPSED_WIDTH_PX}px minmax(0,1fr) ${INSPECTOR_EXPANDED_WIDTH_PX}px`,
		);
		expect(markup).not.toContain(
			"editor-bg-subtle editor-border-subtle overflow-visible rounded-2xl border p-2",
		);
		expect(markup).toContain("editor-border-subtle mt-2 w-full border-b");
		expect(markup).toContain("editor-text-strong text-sm font-semibold");
		expect(markup).toContain("editor-insert-button h-7 w-7 rounded-md p-0");
		expect(markup).not.toContain("editor-insert-button-inner");
		expect(markup).toContain('data-panel-trigger="components"');
		expect(markup).toContain('data-panel-trigger="pages"');
		expect(markup).toContain('data-panel-trigger="ai"');
		expect(markup).toContain('data-panel-trigger="media-types"');
		expect(markup).toContain('aria-label="Components"');
		expect(markup).toContain('aria-label="Pages"');
		expect(markup).toContain('aria-label="AI Assistant"');
		expect(markup).toContain("editor-rail-entry-button");
		expect(markup).toContain("editor-rail-toggle-button");
	});

	it("renders a token-backed storage warning with the persisted payload size", () => {
		const props = createProps();
		props.state = {
			...props.state,
			document: {
				...props.state.document,
				oversizedTestPayload: "x".repeat(
					LOCAL_STORAGE_WARNING_THRESHOLD_BYTES / 2,
				),
			},
		} as typeof props.state;

		const markup = renderToStaticMarkup(<AppShell {...props} />);

		expect(markup).toContain("editor-warning-surface");
		expect(markup).toContain("editor-warning-text");
		expect(markup).toContain("above the 4.00 MB localStorage warning threshold");
		expect(markup).toContain("Dismiss storage warning");
		expect(markup).not.toContain("Document is large (&gt;4 MB)");
	});

	it("renders a list option in the text type popover", () => {
		const props = createProps();
		props.textTypeOpen = true;

		const markup = renderToStaticMarkup(<AppShell {...props} />);

		expect(markup).toContain("Insert text");
		expect(markup).toContain(">List<");
		expect(markup).toContain("Standalone list block");
		expect(markup).toContain('data-text-type-role="richtext"');
	});

	it("renders media choices in the media type popover", () => {
		const props = createProps();
		props.mediaTypeOpen = true;

		const markup = renderToStaticMarkup(<AppShell {...props} />);

		expect(markup).toContain("Insert media");
		expect(markup).toContain(">Image<");
		expect(markup).toContain(">Video<");
		expect(markup).toContain(">SVG<");
		expect(markup).toContain('data-media-type-role="video"');
	});

	it("renders the top bar as a single-row menubar with a centered pages switcher", () => {
		const markup = renderToStaticMarkup(<AppShell {...createProps()} />);

		expect(markup).toContain("Settings");
		expect(markup).toContain("Edit");
		expect(markup).toContain("Copy");
		expect(markup).toContain("Duplicate");
		expect(markup).toContain("Paste");
		expect(markup).toContain("Cmd + C");
		expect(markup).toContain("Cmd + D");
		expect(markup).toContain("Cmd + V");
		expect(markup).toContain("View");
		expect(markup).toContain("Pages");
		expect(markup).toContain("Help");
		expect(markup).toContain("Local Dev");
		expect(markup).toContain("editor-topbar-local-dev-badge");
		expect(markup).toContain('data-ui="topbar-local-dev-badge"');
		expect(markup).toContain("lucide-pickaxe");
		expect(markup).toContain("Start fresh...");
		expect(markup).toContain("editor-topbar-menubar-row");
		expect(markup).toContain("editor-topbar-brand-mark");
		expect(markup).toContain("editor-playground-logo-two-lines-monochrome.svg");
		expect(markup).toContain("editor-topbar-page-switcher");
		expect(markup).toContain("editor-topbar-page-switcher-centered");
		expect(markup).toContain("editor-topbar-page-switcher-row-content");
		expect(markup).toContain('data-ui="select-trigger"');
		expect(markup).toContain("Home");
		expect(markup).not.toContain("editor-topbar-pages-row");
		expect(markup).toContain("Fonts Panel");
		expect(markup).toContain("Shift + F");
		expect(markup).toContain("Shift + V");
		expect(markup).toContain("Shift + H");
		expect(markup).toContain("Shift + R");
		expect(markup).toContain("Shift + D");
		expect(markup).toContain("Cmd + K");
		expect(markup).toContain("Cmd + Alt + P");
		expect(markup).toContain("Components panel");
		expect(markup).toContain("Pages panel");
		expect(markup).toContain("AI Assistant");
		expect(markup).toContain("AI conversation guide");
		expect(markup).toContain("Documentation");
		expect(markup).toContain("Showcase tour");
		expect(markup).not.toContain("Import JSON…");
		expect(markup).not.toContain("Customize…");
		expect(markup.indexOf("Light")).toBeLessThan(markup.indexOf("Dark"));
		expect(markup.indexOf("Dark")).toBeLessThan(markup.indexOf("Customize"));
	});

	it("renders the showcase tour from URL topic and step state", () => {
		vi.stubGlobal("window", {
			name: "",
			location: {
				search: "",
				hash: "#/edit?tour=api&step=model-transfer",
				pathname: "/",
			},
			history: { replaceState: vi.fn() },
		});

		try {
			const markup = renderToStaticMarkup(
				<AppShell
					{...createProps()}
					routeSearchParams={new URLSearchParams("tour=api&step=model-transfer")}
				/>,
			);

			expect(markup).toContain('data-showcase-tour="true"');
			expect(markup).toContain('data-showcase-tour-skin="showcase"');
			expect(markup).toContain("The document can move through import/export");
			expect(markup).toContain("API &amp; Architecture");
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it("renders the layers panel surface when the rail entry is active", () => {
		const { document } = createInitialState();
		const markup = renderToStaticMarkup(
		<LayersPanel
				open
				position={{ top: 112, left: 102 }}
				document={document}
				activePageId={document.pages?.[0]?.id ?? null}
				selectedIds={[]}
				onOpenChange={() => undefined}
				onPositionChange={() => undefined}
				onClose={() => undefined}
				onSelectNode={() => undefined}
				onRenameNode={() => undefined}
				onDeleteNode={() => undefined}
				onSetNodeVisibility={() => undefined}
				onSetTopLevelWrapperVisibility={() => undefined}
				onMoveNodeInTree={() => undefined}
			/>,
		);

		expect(markup).toContain("editor-layers-panel");
		expect(markup).toContain("Components");
		expect(markup).toContain("Structure, visibility, and order.");
	});

	it("renders the manage fonts dialog with an inner scroll container", () => {
		const markup = renderToStaticMarkup(
			<AppShell {...createProps()} manageFontsOpen />,
		);

		expect(markup).toContain("Manage Fonts");
		expect(markup).toContain("editor-panel-header-close");
		expect(markup).toContain("max-h-[min(84vh,820px)]");
		expect(markup).toContain(
			"editor-scrollbar editor-scrollbar-gutter min-h-0 overflow-y-auto p-5 pt-4",
		);
	});

	it("renders the docs browser, detached shortcuts, and about dialogs", () => {
		const markup = renderToStaticMarkup(
			<AppShell {...createProps()} helpOpen shortcutsOpen aboutOpen />,
		);

		expect(markup).toContain('data-help-entry="shortcuts"');
		expect(markup).toContain("Browse docs");
		expect(markup).toContain("Editor Playground");
		expect(markup).toContain("Keyboard shortcuts");
		expect(markup).toContain("Guides");
		expect(markup).toContain("Getting Started");
		expect(markup).toContain("Reference");
		expect(markup).toContain("Developers");
		expect(markup).toContain("API Reference");
		expect(markup).toContain("Workflows");
		expect(markup).toContain("Close shortcuts");
		expect(markup).toContain("Close about");
		expect(markup).toContain("Editor Playground");
	});

	it("renders the focused panel at its stored viewport offset from the workspace-aligned default", () => {
		const props = createProps();
		const state = insertLeaf(props.state, "text");
		if (!state.selectedId) {
			throw new Error("Expected selected text node");
		}
		const selectedNode = state.document.nodes[state.selectedId];
		if (!selectedNode) {
			throw new Error("Expected selected node");
		}

		state.ui.focusedMode = "sticky";
		state.ui.focusedPanelOffset = { x: -48, y: 64 };

		const markup = renderToStaticMarkup(
			<AppShell
				{...props}
				state={state}
				selectedNode={selectedNode}
				selectedNodes={[selectedNode]}
			/>,
		);

		expect(markup).toContain('aria-label="Drag focused panel"');
		expect(markup).toContain("top:76px");
		expect(markup).toContain("right:80px");
		expect(markup).toContain("transform:translate(-48px, 64px)");
	});
});
