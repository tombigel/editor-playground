import { createButtonTextNode, createContainerNode, createLinkTextNode, createMediaNode, createTextNode } from "../model/defaultFactories";
import { createInitialDocument } from "../model/initialDocument";
import type { ContainerNode, DocumentFontFamily } from "../model/types";
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
	onSetNodeVisibility: noop,
	onSetTopLevelWrapperVisibility: noop,
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
	onStickyElevation: () => undefined,
	onStickyElevated: () => undefined,
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

export const mockSection = createContainerNode("section", MOCK_SITE_ID);

/** Section with sticky enabled — shows edge/offset/duration controls. */
export const mockStickySection: ContainerNode = {
	...createContainerNode("section", MOCK_SITE_ID),
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

export const mockContainer = createContainerNode("container", mockSection.id);
export const mockTextLeaf = createTextNode("block", mockContainer.id);
export const mockButtonLeaf = createButtonTextNode(mockContainer.id);
export const mockLinkLeaf = createLinkTextNode(mockContainer.id);
export const mockImageLeaf = createMediaNode("image", mockContainer.id);

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
