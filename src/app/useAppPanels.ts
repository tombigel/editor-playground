import { useRef, useState } from 'react';
import { useDismissFloatingPanels } from './useEditorEnvironment';

const LEFT_FLOATING_PANEL_DEFAULT_TOP_PX = 76;
const LEFT_FLOATING_PANEL_DEFAULT_LEFT_PX = 80;

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
  const [layersOpen, setLayersOpen] = useState(false);
  const [layersPosition, setLayersPosition] = useState(getDefaultLeftFloatingPanelPosition);
  const [layersPositionCustomized, setLayersPositionCustomized] = useState(false);
  const [sectionTemplateOpen, setSectionTemplateOpen] = useState(false);
  const [sectionTemplatePosition, setSectionTemplatePosition] = useState(getDefaultLeftFloatingPanelPosition);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const layersPanelRef = useRef<HTMLDivElement | null>(null);
  const sectionTemplatePanelRef = useRef<HTMLDivElement | null>(null);

  function closeLayersPanel() {
    setLayersOpen(false);
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

  function openSectionTemplates(_trigger: HTMLElement) {
    setSectionTemplatePosition(getDefaultLeftFloatingPanelPosition());
    setSectionTemplateOpen(true);
  }

  function handleSectionTemplateOpenChange(open: boolean) {
    setSectionTemplateOpen(open);
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
      settingsOpen || manageFontsOpen || helpOpen || layersOpen || sectionTemplateOpen,
  };
}
