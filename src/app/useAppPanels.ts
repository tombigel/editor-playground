import { useRef, useState } from 'react';
import { useDismissFloatingPanels, useSectionTemplatePosition } from './useEditorEnvironment';

export function useAppPanels() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [sectionTemplateOpen, setSectionTemplateOpen] = useState(false);
  const [sectionTemplateAnchor, setSectionTemplateAnchor] = useState<HTMLElement | null>(null);
  const [sectionTemplatePosition, setSectionTemplatePosition] = useState({ top: 72, left: 102 });
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const sectionTemplatePanelRef = useRef<HTMLDivElement | null>(null);

  useSectionTemplatePosition(sectionTemplateOpen, sectionTemplateAnchor, setSectionTemplatePosition);

  function closeSectionTemplatePopover() {
    setSectionTemplateOpen(false);
    setSectionTemplateAnchor(null);
  }

  function closeTransientPanels() {
    closeSectionTemplatePopover();
    setSettingsOpen(false);
    setShortcutHelpOpen(false);
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
  });

  return {
    settingsOpen,
    setSettingsOpen,
    shortcutHelpOpen,
    setShortcutHelpOpen,
    sectionTemplateOpen,
    sectionTemplatePosition,
    settingsPanelRef,
    sectionTemplatePanelRef,
    openSectionTemplates,
    handleSectionTemplateOpenChange,
    closeSectionTemplatePopover,
    closeTransientPanels,
    hasDismissiblePanels: settingsOpen || shortcutHelpOpen || sectionTemplateOpen,
  };
}
