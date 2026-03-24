import { useRef, useState } from 'react';
import {
  useDismissFloatingPanels,
  useSectionTemplatePosition,
} from './useEditorEnvironment';

const LAYERS_PANEL_DEFAULT_LEFT_PX = 88;
const LAYERS_PANEL_ESTIMATED_HEIGHT_PX = 420;

function getDefaultLayersPanelPosition() {
  if (typeof window === 'undefined') {
    return { top: 148, left: LAYERS_PANEL_DEFAULT_LEFT_PX };
  }

  return {
    top: Math.max(72, Math.round(window.innerHeight / 2 - LAYERS_PANEL_ESTIMATED_HEIGHT_PX / 2)),
    left: LAYERS_PANEL_DEFAULT_LEFT_PX,
  };
}

export function useAppPanels() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manageFontsOpen, setManageFontsOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [layersPosition, setLayersPosition] = useState(getDefaultLayersPanelPosition);
  const [layersPositionCustomized, setLayersPositionCustomized] = useState(false);
  const [sectionTemplateOpen, setSectionTemplateOpen] = useState(false);
  const [sectionTemplateAnchor, setSectionTemplateAnchor] = useState<HTMLElement | null>(null);
  const [sectionTemplatePosition, setSectionTemplatePosition] = useState({ top: 72, left: 102 });
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const layersPanelRef = useRef<HTMLDivElement | null>(null);
  const sectionTemplatePanelRef = useRef<HTMLDivElement | null>(null);

  useSectionTemplatePosition(sectionTemplateOpen, sectionTemplateAnchor, setSectionTemplatePosition);

  function closeLayersPanel() {
    setLayersOpen(false);
  }

  function closeSectionTemplatePopover() {
    setSectionTemplateOpen(false);
    setSectionTemplateAnchor(null);
  }

  function closeTransientPanels() {
    closeLayersPanel();
    closeSectionTemplatePopover();
    setSettingsOpen(false);
    setManageFontsOpen(false);
    setShortcutHelpOpen(false);
  }

  function openLayers(_trigger: HTMLElement) {
    if (!layersPositionCustomized) {
      setLayersPosition(getDefaultLayersPanelPosition());
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

  function openSectionTemplates(trigger: HTMLElement) {
    setSectionTemplateAnchor(trigger);
    setSectionTemplateOpen(true);
  }

  function handleSectionTemplateOpenChange(open: boolean) {
    setSectionTemplateOpen(open);
    if (!open) {
      setSectionTemplateAnchor(null);
    }
  }

  useDismissFloatingPanels({
    settingsOpen,
    settingsPanelRef,
    onCloseSettings: () => setSettingsOpen(false),
    sectionTemplateOpen,
    sectionTemplatePanelRef,
    onCloseSectionTemplates: closeSectionTemplatePopover,
    layersOpen,
    layersPanelRef,
    onCloseLayers: closeLayersPanel,
  });

  return {
    settingsOpen,
    setSettingsOpen,
    manageFontsOpen,
    setManageFontsOpen,
    shortcutHelpOpen,
    setShortcutHelpOpen,
    layersOpen,
    layersPosition,
    layersPanelRef,
    openLayers,
    handleLayersOpenChange,
    handleLayersPositionChange,
    closeLayersPanel,
    sectionTemplateOpen,
    sectionTemplatePosition,
    settingsPanelRef,
    sectionTemplatePanelRef,
    openSectionTemplates,
    handleSectionTemplateOpenChange,
    closeSectionTemplatePopover,
    closeTransientPanels,
    hasDismissiblePanels:
      settingsOpen || manageFontsOpen || shortcutHelpOpen || layersOpen || sectionTemplateOpen,
  };
}
