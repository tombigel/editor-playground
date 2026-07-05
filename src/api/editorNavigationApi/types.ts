import type {
	AnimationPreviewState,
	EditorState,
	FocusedMode,
} from "../../editor/types";
import type {
	ContainerSubtype,
	DocumentNode,
	MediaSubtype,
	NodeId,
	TextSubtype,
} from "../documentApi";

export type EditorPanelId =
	| "settings"
	| "manageFonts"
	| "help"
	| "shortcuts"
	| "about"
	| "components"
	| "pages"
	| "sectionTemplates"
	| "textTypes"
	| "mediaTypes"
	| "ai";

export type EditorSettingsSectionId =
	| "display"
	| "pages"
	| "defaults"
	| "fonts"
	| "transfer"
	| "advanced"
	| "shortcuts";

export type EditorPagesPanelTab = "page" | "settings";

export type EditorPanelPosition = {
	top: number;
	left: number;
};

export type EditorPanelState = {
	settingsOpen: boolean;
	manageFontsOpen: boolean;
	helpOpen: boolean;
	shortcutsOpen: boolean;
	aboutOpen: boolean;
	componentsOpen: boolean;
	pagesOpen: boolean;
	sectionTemplateOpen: boolean;
	textTypeOpen: boolean;
	mediaTypeOpen: boolean;
	aiOpen: boolean;
	componentsPosition: EditorPanelPosition;
	pagesPosition: EditorPanelPosition;
	componentsPositionCustomized: boolean;
	pagesPositionCustomized: boolean;
	settingsSectionTarget?: EditorSettingsSectionId;
	helpEntryTarget?: string;
	pagesPanelTabTarget: EditorPagesPanelTab;
	requestedPageSettingsId: string | null;
};

export type EditorPanelRequest =
	| { type: "open"; panel: EditorPanelId; position?: EditorPanelPosition }
	| { type: "close"; panel: EditorPanelId }
	| {
			type: "toggle";
			panel: Extract<EditorPanelId, "components" | "pages" | "manageFonts" | "ai">;
	  }
	| { type: "closeAll" }
	| { type: "openSettingsSection"; section: EditorSettingsSectionId }
	| { type: "openHelpEntry"; entryId?: string }
	| {
			type: "openPages";
			pageId?: string | null;
			tab?: EditorPagesPanelTab;
			position?: EditorPanelPosition;
	  };

export type EditorNodeTarget = {
	id?: NodeId;
	name?: string;
	nameIncludes?: string;
	contentType?: DocumentNode["contentType"];
	subtype?: ContainerSubtype | TextSubtype | MediaSubtype;
	sticky?: boolean;
	visible?: boolean;
	selectable?: boolean;
	animatable?: boolean;
};

export type EditorViewFlags = {
	showHidden?: boolean;
	previewSticky?: boolean;
	animationPreviewEnabled?: boolean;
	spacerVisibility?: EditorState["ui"]["spacerVisibility"];
	showGridLanes?: boolean;
	showDebugInfo?: boolean;
	focusedMode?: FocusedMode;
	inspectorCollapsed?: boolean;
	temporaryInspectorOpen?: boolean;
};

export type EditorNavigationUrlState = {
	activePageId?: string;
	selectedNodeId?: string;
	focusedMode?: FocusedMode;
	panel?: EditorPanelId;
	settingsSection?: EditorSettingsSectionId;
	helpEntryId?: string;
	pageTargetId?: string;
	pagesTab?: EditorPagesPanelTab;
	tourTopic?: string;
	tourStep?: string;
	showHidden?: boolean;
	previewSticky?: boolean;
	animationPreviewEnabled?: boolean;
	spacerVisibility?: EditorState["ui"]["spacerVisibility"];
	showGridLanes?: boolean;
	showDebugInfo?: boolean;
};

export type ApplyEditorNavigationOptions = {
	nodeTarget?: EditorNodeTarget;
};

export type { AnimationPreviewState };
