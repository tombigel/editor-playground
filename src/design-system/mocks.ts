import { createLeaf, createWrapper } from "../model/defaultFactories";
import { createInitialDocument } from "../model/initialDocument";
import type { DocumentFontFamily, WrapperNode } from "../model/types";
import { parseUnitValue } from "../model/units";
import type {
	InspectorActionHandlers,
	InspectorOrderState,
} from "../panels/inspector/types";

const noop = () => {};

export const noopActions: InspectorActionHandlers = {
	onTextChange: noop,
	onWrapperStyleChange: noop,
	onRectChange: noop,
	onPromote: noop,
	onDemote: noop,
	onStickyEnabled: noop,
	onStickyTarget: noop,
	onStickyEdges: noop,
	onStickyOffset: noop,
	onStickyOffsetTop: noop,
	onStickyOffsetBottom: noop,
	onStickyDurationMode: noop,
	onStickyDuration: noop,
	onStickyDurationTop: noop,
	onStickyDurationBottom: noop,
	onEnterFocusedMode: noop,
	onOpenManageFonts: noop,
};

export const noopOrderState: InspectorOrderState = {
	showOrderControls: true,
	canOrderBack: true,
	canOrderForward: true,
	canSendToBack: true,
	canBringToFront: true,
	orderBackShortcut: "Mod+[",
	orderForwardShortcut: "Mod+]",
	sendToBackShortcut: "Mod+Shift+[",
	bringToFrontShortcut: "Mod+Shift+]",
	canSectionBack: false,
	canSectionForward: false,
	onOrderBack: noop,
	onOrderForward: noop,
	onSendToBack: noop,
	onBringToFront: noop,
	onSectionBack: noop,
	onSectionForward: noop,
};

export const mockDocument = createInitialDocument();

const MOCK_SITE_ID = "mock-site";

export const mockSection = createWrapper("section", MOCK_SITE_ID);

/** Section with sticky enabled — shows edge/offset/duration controls. */
export const mockStickySection: WrapperNode = {
	...createWrapper("section", MOCK_SITE_ID),
	name: "Sticky Section",
	sticky: {
		enabled: true,
		target: "self",
		edges: { top: true },
		offsetTop: parseUnitValue("10vh"),
		duration: parseUnitValue("200vh"),
		durationMode: "auto",
	},
};

export const mockContainer = createWrapper("container", mockSection.id);
export const mockTextLeaf = createLeaf("text", mockContainer.id);
export const mockButtonLeaf = createLeaf("button", mockContainer.id);
export const mockLinkLeaf = createLeaf("link", mockContainer.id);
export const mockImageLeaf = createLeaf("image", mockContainer.id);

export const mockFontFamilies: DocumentFontFamily[] = [
	{
		family: "Inter",
		category: "sans-serif",
		subsets: ["latin"],
		variants: ["400", "500", "600", "700"],
		isVariable: false,
		source: "google-fonts",
		favorite: false,
		origin: "added",
	},
	{
		family: "Roboto",
		category: "sans-serif",
		subsets: ["latin"],
		variants: ["300", "400", "500", "700"],
		isVariable: false,
		source: "google-fonts",
		favorite: false,
		origin: "added",
	},
	{
		family: "Playfair Display",
		category: "serif",
		subsets: ["latin"],
		variants: ["400", "700"],
		isVariable: false,
		source: "google-fonts",
		favorite: false,
		origin: "added",
	},
	{
		family: "JetBrains Mono",
		category: "monospace",
		subsets: ["latin"],
		variants: ["400", "500", "700"],
		isVariable: false,
		source: "google-fonts",
		favorite: false,
		origin: "added",
	},
];
