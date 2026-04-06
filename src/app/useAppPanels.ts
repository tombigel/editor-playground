import { useRef, useState } from "react";
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
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [manageFontsOpen, setManageFontsOpen] = useState(false);
	const [helpOpen, setHelpOpen] = useState(false);
	const [shortcutsOpen, setShortcutsOpen] = useState(false);
	const [aboutOpen, setAboutOpen] = useState(false);
	const [layersOpen, setLayersOpen] = useState(false);
	const [pagesOpen, setPagesOpen] = useState(false);
	const [layersPosition, setLayersPosition] = useState(
		getDefaultLeftFloatingPanelPosition,
	);
	const [layersPositionCustomized, setLayersPositionCustomized] =
		useState(false);
	const [pagesPosition, setPagesPosition] = useState(() => ({
		top: LEFT_FLOATING_PANEL_DEFAULT_TOP_PX,
		left: RIGHT_FLOATING_PANEL_DEFAULT_LEFT_PX,
	}));
	const [pagesPositionCustomized, setPagesPositionCustomized] = useState(false);
	const [sectionTemplateOpen, setSectionTemplateOpen] = useState(false);
	const [textTypeOpen, setTextTypeOpen] = useState(false);
	const settingsPanelRef = useRef<HTMLDivElement | null>(null);
	const layersPanelRef = useRef<HTMLDivElement | null>(null);
	const pagesPanelRef = useRef<HTMLDivElement | null>(null);
	const sectionTemplatePanelRef = useRef<HTMLDivElement | null>(null);
	const textTypePanelRef = useRef<HTMLDivElement | null>(null);

	function closeLayersPanel() {
		setLayersOpen(false);
	}

	function toggleLayersPanel() {
		setLayersOpen((open) => !open);
	}

	function toggleManageFontsPanel() {
		setManageFontsOpen((open) => !open);
	}

	function togglePagesPanel() {
		setPagesOpen((open) => {
			if (open) {
				return false;
			}
			if (!pagesPositionCustomized) {
				setPagesPosition({
					top: LEFT_FLOATING_PANEL_DEFAULT_TOP_PX,
					left: RIGHT_FLOATING_PANEL_DEFAULT_LEFT_PX,
				});
			}
			return true;
		});
	}

	function openPages() {
		if (!pagesPositionCustomized) {
			setPagesPosition({
				top: LEFT_FLOATING_PANEL_DEFAULT_TOP_PX,
				left: RIGHT_FLOATING_PANEL_DEFAULT_LEFT_PX,
			});
		}
		setPagesOpen(true);
	}

	function closeSectionTemplatePopover() {
		setSectionTemplateOpen(false);
	}

	function closeTransientPanels() {
		closeLayersPanel();
		closeSectionTemplatePopover();
		setSettingsOpen(false);
		setManageFontsOpen(false);
		setHelpOpen(false);
		setShortcutsOpen(false);
		setAboutOpen(false);
		setPagesOpen(false);
	}

	function openLayers(_trigger: HTMLElement) {
		if (!layersPositionCustomized) {
			setLayersPosition(getDefaultLeftFloatingPanelPosition());
		}
		setLayersOpen(true);
	}

	function handleLayersOpenChange(open: boolean) {
		setLayersOpen(open);
	}

	function handleLayersPositionChange(position: { top: number; left: number }) {
		setLayersPosition(position);
		setLayersPositionCustomized(true);
	}

	function handlePagesPositionChange(position: { top: number; left: number }) {
		setPagesPosition(position);
		setPagesPositionCustomized(true);
	}

	function openSectionTemplates(_trigger: HTMLElement) {
		setSectionTemplateOpen(true);
	}

	function handleSectionTemplateOpenChange(open: boolean) {
		setSectionTemplateOpen(open);
	}

	function openTextTypePopover(_trigger: HTMLElement) {
		setTextTypeOpen(true);
	}

	function closeTextTypePopover() {
		setTextTypeOpen(false);
	}

	function handleTextTypeOpenChange(open: boolean) {
		setTextTypeOpen(open);
	}

	useDismissFloatingPanels({
		settingsOpen,
		settingsPanelRef,
		onCloseSettings: () => setSettingsOpen(false),
		sectionTemplateOpen,
		sectionTemplatePanelRef,
		onCloseSectionTemplates: closeSectionTemplatePopover,
	});

	return {
		settingsOpen,
		setSettingsOpen,
		manageFontsOpen,
		setManageFontsOpen,
		helpOpen,
		setHelpOpen,
		shortcutsOpen,
		setShortcutsOpen,
		aboutOpen,
		setAboutOpen,
		layersOpen,
		pagesOpen,
		setPagesOpen,
		layersPosition,
		pagesPosition,
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
		sectionTemplateOpen,
		settingsPanelRef,
		sectionTemplatePanelRef,
		openSectionTemplates,
		handleSectionTemplateOpenChange,
		closeSectionTemplatePopover,
		textTypeOpen,
		textTypePanelRef,
		openTextTypePopover,
		closeTextTypePopover,
		handleTextTypeOpenChange,
		closeTransientPanels,
		hasDismissiblePanels:
			settingsOpen ||
			manageFontsOpen ||
			helpOpen ||
			shortcutsOpen ||
			aboutOpen ||
			layersOpen ||
			pagesOpen ||
			sectionTemplateOpen ||
			textTypeOpen,
	};
}
