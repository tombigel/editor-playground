import { useRef, useState, type SetStateAction } from "react";
import {
	applyEditorPanelRequest,
	createDefaultEditorPanelState,
	type EditorPanelId,
	type EditorPanelState,
	type EditorPanelPosition,
} from "@/api/editorNavigationApi";
import { useDismissFloatingPanels } from "./useEditorEnvironment";

const LEFT_FLOATING_PANEL_DEFAULT_TOP_PX = 76;
const LEFT_FLOATING_PANEL_DEFAULT_LEFT_PX = 80;
const RIGHT_FLOATING_PANEL_DEFAULT_LEFT_PX = 416;

function getDefaultLeftFloatingPanelPosition() {
	return {
		top: LEFT_FLOATING_PANEL_DEFAULT_TOP_PX,
		left: LEFT_FLOATING_PANEL_DEFAULT_LEFT_PX,
	};
}

export function useAppPanels() {
	const [panelState, setPanelState] = useState(() =>
		createDefaultEditorPanelState({
			componentsPosition: getDefaultLeftFloatingPanelPosition(),
			pagesPosition: {
				top: LEFT_FLOATING_PANEL_DEFAULT_TOP_PX,
				left: RIGHT_FLOATING_PANEL_DEFAULT_LEFT_PX,
			},
		}),
	);
	const settingsPanelRef = useRef<HTMLDivElement | null>(null);
	const layersPanelRef = useRef<HTMLDivElement | null>(null);
	const pagesPanelRef = useRef<HTMLDivElement | null>(null);
	const sectionTemplatePanelRef = useRef<HTMLDivElement | null>(null);
	const textTypePanelRef = useRef<HTMLDivElement | null>(null);
	const aiPanelRef = useRef<HTMLDivElement | null>(null);
	const [aiPosition, setAiPosition] = useState<EditorPanelPosition>(
		getDefaultLeftFloatingPanelPosition,
	);

	function applyPanelRequest(
		request: Parameters<typeof applyEditorPanelRequest>[1],
	) {
		setPanelState((state) => applyEditorPanelRequest(state, request));
	}

	function setPanelOpen(
		panel: EditorPanelId,
		value: SetStateAction<boolean>,
	) {
		setPanelState((state) => {
			const current = getPanelOpenState(state, panel);
			const nextValue = typeof value === "function" ? value(current) : value;
			return applyEditorPanelRequest(state, {
				type: nextValue ? "open" : "close",
				panel,
			});
		});
	}

	function closeLayersPanel() {
		applyPanelRequest({ type: "close", panel: "components" });
	}

	function toggleLayersPanel() {
		applyPanelRequest({ type: "toggle", panel: "components" });
	}

	function toggleManageFontsPanel() {
		applyPanelRequest({ type: "toggle", panel: "manageFonts" });
	}

	function togglePagesPanel() {
		applyPanelRequest({ type: "toggle", panel: "pages" });
	}

	function toggleAiPanel() {
		applyPanelRequest({ type: "toggle", panel: "ai" });
	}

	function openPages() {
		applyPanelRequest({ type: "openPages" });
	}

	function closeSectionTemplatePopover() {
		applyPanelRequest({ type: "close", panel: "sectionTemplates" });
	}

	function closeTransientPanels() {
		applyPanelRequest({ type: "closeAll" });
	}

	function openLayers(_trigger: HTMLElement) {
		applyPanelRequest({ type: "open", panel: "components" });
	}

	function handleLayersOpenChange(open: boolean) {
		setPanelOpen("components", open);
	}

	function handleLayersPositionChange(position: EditorPanelPosition) {
		setPanelState((state) => ({
			...state,
			componentsPosition: position,
			componentsPositionCustomized: true,
		}));
	}

	function handlePagesPositionChange(position: EditorPanelPosition) {
		setPanelState((state) => ({
			...state,
			pagesPosition: position,
			pagesPositionCustomized: true,
		}));
	}

	function openSectionTemplates(_trigger: HTMLElement) {
		applyPanelRequest({ type: "open", panel: "sectionTemplates" });
	}

	function handleSectionTemplateOpenChange(open: boolean) {
		setPanelOpen("sectionTemplates", open);
	}

	function openTextTypePopover(_trigger: HTMLElement) {
		applyPanelRequest({ type: "open", panel: "textTypes" });
	}

	function closeTextTypePopover() {
		applyPanelRequest({ type: "close", panel: "textTypes" });
	}

	function handleTextTypeOpenChange(open: boolean) {
		setPanelOpen("textTypes", open);
	}

	useDismissFloatingPanels({
		settingsOpen: panelState.settingsOpen,
		settingsPanelRef,
		onCloseSettings: () => setPanelOpen("settings", false),
		sectionTemplateOpen: panelState.sectionTemplateOpen,
		sectionTemplatePanelRef,
		onCloseSectionTemplates: closeSectionTemplatePopover,
	});

	return {
		settingsOpen: panelState.settingsOpen,
		setSettingsOpen: (value: SetStateAction<boolean>) =>
			setPanelOpen("settings", value),
		manageFontsOpen: panelState.manageFontsOpen,
		setManageFontsOpen: (value: SetStateAction<boolean>) =>
			setPanelOpen("manageFonts", value),
		helpOpen: panelState.helpOpen,
		setHelpOpen: (value: SetStateAction<boolean>) =>
			setPanelOpen("help", value),
		shortcutsOpen: panelState.shortcutsOpen,
		setShortcutsOpen: (value: SetStateAction<boolean>) =>
			setPanelOpen("shortcuts", value),
		aboutOpen: panelState.aboutOpen,
		setAboutOpen: (value: SetStateAction<boolean>) =>
			setPanelOpen("about", value),
		layersOpen: panelState.componentsOpen,
		pagesOpen: panelState.pagesOpen,
		setPagesOpen: (value: SetStateAction<boolean>) =>
			setPanelOpen("pages", value),
		aiOpen: panelState.aiOpen,
		setAiOpen: (value: SetStateAction<boolean>) => setPanelOpen("ai", value),
		aiPanelRef,
		aiPosition,
		handleAiPositionChange: (position: EditorPanelPosition) =>
			setAiPosition(position),
		toggleAiPanel,
		layersPosition: panelState.componentsPosition,
		pagesPosition: panelState.pagesPosition,
		layersPanelRef,
		pagesPanelRef,
		openLayers,
		openPages,
		toggleManageFontsPanel,
		toggleLayersPanel,
		togglePagesPanel,
		handleLayersOpenChange,
		handleLayersPositionChange,
		handlePagesPositionChange,
		closeLayersPanel,
		sectionTemplateOpen: panelState.sectionTemplateOpen,
		settingsPanelRef,
		sectionTemplatePanelRef,
		openSectionTemplates,
		handleSectionTemplateOpenChange,
		closeSectionTemplatePopover,
		textTypeOpen: panelState.textTypeOpen,
		textTypePanelRef,
		openTextTypePopover,
		closeTextTypePopover,
		handleTextTypeOpenChange,
		closeTransientPanels,
		hasDismissiblePanels:
			panelState.settingsOpen ||
			panelState.manageFontsOpen ||
			panelState.helpOpen ||
			panelState.shortcutsOpen ||
			panelState.aboutOpen ||
			panelState.componentsOpen ||
			panelState.pagesOpen ||
			panelState.sectionTemplateOpen ||
			panelState.textTypeOpen ||
			panelState.aiOpen,
	};
}

function getPanelOpenState(state: EditorPanelState, panel: EditorPanelId) {
	switch (panel) {
		case "settings":
			return state.settingsOpen;
		case "manageFonts":
			return state.manageFontsOpen;
		case "help":
			return state.helpOpen;
		case "shortcuts":
			return state.shortcutsOpen;
		case "about":
			return state.aboutOpen;
		case "components":
			return state.componentsOpen;
		case "pages":
			return state.pagesOpen;
		case "sectionTemplates":
			return state.sectionTemplateOpen;
		case "textTypes":
			return state.textTypeOpen;
		case "ai":
			return state.aiOpen;
	}
}
