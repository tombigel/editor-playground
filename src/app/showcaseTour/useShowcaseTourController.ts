import {
	useCallback,
	useMemo,
	useRef,
	useState,
	type Dispatch,
	type SetStateAction,
} from "react";
import {
	buildEditorNavigationSearch,
	parseEditorNavigationSearch,
	type EditorPanelId,
	type EditorPanelRequest,
} from "@/api/editorNavigationApi";
import {
	getShowcaseTourPanelRequests,
	resolveShowcaseTourLocation,
	type ShowcaseTourLocation,
	type ShowcaseTourStepNavigation,
} from "@/api/showcaseTourApi";
import type { HelpEntry } from "@/panels/helpDocs";
import type { SettingsSectionId } from "@/panels/settings/settingsSections";
import type { EditorState } from "@/api/editorApi";
import type { HistoryAction } from "../editorState";
import { buildAppHash, parseAppRoute } from "../appRouting";
import { SHOWCASE_TOUR_CONFIG } from "./showcaseTourConfig";

const EDITOR_NAVIGATION_SEARCH_KEYS = [
	"page",
	"select",
	"focus-mode",
	"panel",
	"settings",
	"help",
	"page-target",
	"pages-tab",
	"show-hidden",
	"sticky-preview",
	"animation-preview",
	"grid",
	"debug",
	"spacers",
	"tour",
	"step",
] as const;

type UseShowcaseTourControllerOptions = {
	searchParams: URLSearchParams;
	state: EditorState;
	dispatch: Dispatch<HistoryAction>;
	layersOpen: boolean;
	pagesOpen: boolean;
	manageFontsOpen: boolean;
	setRequestedPageSettingsId: Dispatch<SetStateAction<string | null>>;
	setPagesPanelTabTarget: Dispatch<SetStateAction<"page" | "settings">>;
	setSettingsSectionTarget: Dispatch<
		SetStateAction<SettingsSectionId | undefined>
	>;
	setHelpEntryTarget: Dispatch<SetStateAction<HelpEntry["id"] | undefined>>;
	onLayersOpenChange: (open: boolean) => void;
	onLayersPositionChange: (position: { top: number; left: number }) => void;
	onPagesOpenChange: (open: boolean) => void;
	onPagesPositionChange: (position: { top: number; left: number }) => void;
	onSettingsOpenChange: (open: boolean) => void;
	onManageFontsOpenChange: (open: boolean) => void;
	onHelpOpenChange: (open: boolean) => void;
	onShortcutsOpenChange: (open: boolean) => void;
	onAboutOpenChange: (open: boolean) => void;
	onSectionTemplateOpenChange: (open: boolean) => void;
	onTextTypeOpenChange: (open: boolean) => void;
};

type ShowcaseTourReturnState = {
	search: string;
	navigation: {
		activePageId?: string;
		selectedNodeId?: string;
		focusedMode: EditorState["ui"]["focusedMode"];
		showHidden: boolean;
		previewSticky: boolean;
		animationPreviewEnabled: boolean;
		spacerVisibility: EditorState["ui"]["spacerVisibility"];
		showGridLanes: boolean;
		showDebugInfo: boolean;
	};
};

export function useShowcaseTourController({
	searchParams,
	state,
	dispatch,
	layersOpen,
	pagesOpen,
	manageFontsOpen,
	setRequestedPageSettingsId,
	setPagesPanelTabTarget,
	setSettingsSectionTarget,
	setHelpEntryTarget,
	onLayersOpenChange,
	onLayersPositionChange,
	onPagesOpenChange,
	onPagesPositionChange,
	onSettingsOpenChange,
	onManageFontsOpenChange,
	onHelpOpenChange,
	onShortcutsOpenChange,
	onAboutOpenChange,
	onSectionTemplateOpenChange,
	onTextTypeOpenChange,
}: UseShowcaseTourControllerOptions) {
	const initialTourLocation = useMemo<ShowcaseTourLocation | null>(() => {
		const navigation = parseEditorNavigationSearch(searchParams);
		if (!navigation.tourTopic && !navigation.tourStep) {
			return null;
		}
		return resolveShowcaseTourLocation(SHOWCASE_TOUR_CONFIG, {
			topicId: navigation.tourTopic,
			stepId: navigation.tourStep,
		});
	}, [searchParams]);
	const [showcaseTourLocation, setShowcaseTourLocation] =
		useState<ShowcaseTourLocation | null>(initialTourLocation);
	const tourReturnStateRef = useRef<ShowcaseTourReturnState | null>(
		initialTourLocation
			? createShowcaseTourReturnState(state, searchParams, "clean")
			: null,
	);

	const applyPanelOpen = useCallback(
		(panel: EditorPanelId, open: boolean) => {
			switch (panel) {
				case "settings":
					onSettingsOpenChange(open);
					return;
				case "manageFonts":
					onManageFontsOpenChange(open);
					return;
				case "help":
					onHelpOpenChange(open);
					return;
				case "shortcuts":
					onShortcutsOpenChange(open);
					return;
				case "about":
					onAboutOpenChange(open);
					return;
				case "components":
					onLayersOpenChange(open);
					return;
				case "pages":
					onPagesOpenChange(open);
					return;
				case "sectionTemplates":
					onSectionTemplateOpenChange(open);
					return;
				case "textTypes":
					onTextTypeOpenChange(open);
					return;
			}
		},
		[
			onAboutOpenChange,
			onHelpOpenChange,
			onLayersOpenChange,
			onManageFontsOpenChange,
			onPagesOpenChange,
			onSectionTemplateOpenChange,
			onSettingsOpenChange,
			onShortcutsOpenChange,
			onTextTypeOpenChange,
		],
	);

	const applyPanelRequest = useCallback(
		(request: EditorPanelRequest) => {
			switch (request.type) {
				case "open":
					applyPanelOpen(request.panel, true);
					if (request.panel === "pages" && request.position) {
						onPagesPositionChange(request.position);
					}
					if (request.panel === "components" && request.position) {
						onLayersPositionChange(request.position);
					}
					return;
				case "close":
					applyPanelOpen(request.panel, false);
					return;
				case "toggle":
					if (request.panel === "components") {
						onLayersOpenChange(!layersOpen);
					} else if (request.panel === "pages") {
						onPagesOpenChange(!pagesOpen);
					} else {
						onManageFontsOpenChange(!manageFontsOpen);
					}
					return;
				case "closeAll":
					for (const panel of [
						"settings",
						"manageFonts",
						"help",
						"shortcuts",
						"about",
						"components",
						"pages",
						"sectionTemplates",
						"textTypes",
					] satisfies EditorPanelId[]) {
						applyPanelOpen(panel, false);
					}
					return;
				case "openSettingsSection":
					setSettingsSectionTarget(request.section);
					onSettingsOpenChange(true);
					return;
				case "openHelpEntry":
					setHelpEntryTarget(request.entryId);
					onHelpOpenChange(true);
					return;
				case "openPages":
					setRequestedPageSettingsId(request.pageId ?? null);
					setPagesPanelTabTarget(request.tab ?? "page");
					if (request.position) {
						onPagesPositionChange(request.position);
					}
					onPagesOpenChange(true);
					return;
			}
		},
		[
			applyPanelOpen,
			layersOpen,
			manageFontsOpen,
			onHelpOpenChange,
			onLayersOpenChange,
			onLayersPositionChange,
			onManageFontsOpenChange,
			onPagesOpenChange,
			onPagesPositionChange,
			onSettingsOpenChange,
			pagesOpen,
			setHelpEntryTarget,
			setPagesPanelTabTarget,
			setRequestedPageSettingsId,
			setSettingsSectionTarget,
		],
	);

	const handleApplyShowcaseTourNavigation = useCallback(
		(navigation: ShowcaseTourStepNavigation) => {
			if (navigation.insertSectionTemplate) {
				const { templateId, ifMissingNodeName } =
					navigation.insertSectionTemplate;
				const templateAlreadyExists =
					ifMissingNodeName &&
					Object.values(state.document.nodes).some(
						(node) => node.name === ifMissingNodeName,
					);
				if (!templateAlreadyExists) {
					dispatch({ type: "insertSectionTemplate", templateId });
				}
			}
			if (navigation.editor || navigation.nodeTarget) {
				dispatch({
					type: "applyEditorNavigation",
					navigation: navigation.editor ?? {},
					nodeTarget: navigation.nodeTarget,
				});
			}
			for (const panelRequest of getShowcaseTourPanelRequests(navigation)) {
				applyPanelRequest(panelRequest);
			}
		},
		[applyPanelRequest, dispatch, state.document.nodes],
	);

	const handleOpenShowcaseTour = useCallback(() => {
		const location = resolveShowcaseTourLocation(SHOWCASE_TOUR_CONFIG, null);
		tourReturnStateRef.current = createShowcaseTourReturnState(
			state,
			typeof window === "undefined"
				? searchParams
				: parseAppRoute(window.location.hash).search,
			"preserve",
		);
		setShowcaseTourLocation(location);
		if (typeof window === "undefined") return;
		const nextSearch = buildEditorNavigationSearch(
			{ tourTopic: location.topicId, tourStep: location.stepId },
			parseAppRoute(window.location.hash).search,
		);
		window.history.replaceState(
			null,
			"",
			`${window.location.pathname}${buildAppHash("edit", nextSearch)}`,
		);
	}, [searchParams, state]);

	const handleCloseShowcaseTour = useCallback(() => {
		const returnState = tourReturnStateRef.current;
		tourReturnStateRef.current = null;
		setShowcaseTourLocation(null);
		if (returnState) {
			dispatch({
				type: "applyEditorNavigation",
				navigation: returnState.navigation,
			});
		}
		if (typeof window === "undefined") return;
		window.history.replaceState(
			null,
			"",
			`${window.location.pathname}${buildAppHash("edit", returnState?.search)}`,
		);
	}, [dispatch]);

	return {
		showcaseTourLocation,
		setShowcaseTourLocation,
		handleApplyShowcaseTourNavigation,
		handleOpenShowcaseTour,
		handleCloseShowcaseTour,
	};
}

export function createShowcaseTourReturnState(
	state: EditorState,
	search: string | URLSearchParams,
	mode: "preserve" | "clean",
): ShowcaseTourReturnState {
	return {
		search:
			mode === "preserve"
				? normalizeSearch(search)
				: getSearchWithoutEditorNavigation(search),
		navigation: {
			activePageId: state.activePageId ?? undefined,
			selectedNodeId: state.selectedId ?? undefined,
			focusedMode: state.ui.focusedMode,
			showHidden: state.ui.showHidden,
			previewSticky: state.ui.previewSticky,
			animationPreviewEnabled: state.ui.animationPreview.enabled,
			spacerVisibility: state.ui.spacerVisibility,
			showGridLanes: state.ui.showGridLanes,
			showDebugInfo: state.ui.showDebugInfo,
		},
	};
}

function getSearchWithoutEditorNavigation(search: string | URLSearchParams) {
	const params =
		search instanceof URLSearchParams
			? new URLSearchParams(search)
			: new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
	for (const key of EDITOR_NAVIGATION_SEARCH_KEYS) {
		params.delete(key);
	}
	return normalizeSearch(params);
}

function normalizeSearch(search: string | URLSearchParams) {
	const serialized =
		search instanceof URLSearchParams
			? search.toString()
			: search.startsWith("?")
				? search.slice(1)
				: search;
	return serialized ? `?${serialized}` : "";
}
