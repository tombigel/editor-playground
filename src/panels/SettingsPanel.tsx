import { Settings } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  DocumentModel,
  FocusedMode,
} from '../api/editorApi';
import type {
  AnimationPreviewState,
  SnapSettings,
} from '../editor/types';
import type { DocumentFontFamily } from '../model/types';
import { EditorPanelHeader } from './EditorPanelHeader';
import {
  DEFAULT_SETTINGS_SECTION_ID,
  SETTINGS_SECTION_META,
  type SettingsSectionId,
} from './settings/settingsSections';
import type { ActionResult } from './settingsTransfer';
import type { SettingsTransferState } from './settings/useSettingsTransferState';
import { useSettingsTransferState } from './settings/useSettingsTransferState';
import { AdvancedSettingsSection } from './settings/sections/AdvancedSettingsSection';
import { DefaultsSettingsSection } from './settings/sections/DefaultsSettingsSection';
import { DisplaySettingsSection } from './settings/sections/DisplaySettingsSection';
import { FontsSettingsSection } from './settings/sections/FontsSettingsSection';
import { SettingsSectionNav } from './settings/sections/SettingsSectionNav';
import { ShortcutsSettingsSection } from './settings/sections/ShortcutsSettingsSection';
import { TransferSettingsSection } from './settings/sections/TransferSettingsSection';
import type {
  EditorDarkTheme,
  EditorLightTheme,
  ResolvedTheme,
  ThemeMode,
} from '@/lib/theme';

type Props = {
  document: DocumentModel;
  documentJson: string;
  previewSticky: boolean;
  animationPreview: AnimationPreviewState;
  onAnimationPreviewChange: (value: Partial<AnimationPreviewState>) => void;
  spacerVisibility: 'selected' | 'all';
  showGridLanes: boolean;
  showDebugInfo: boolean;
  snapSettings: SnapSettings;
  themeMode: ThemeMode;
  accentColor: string;
  lightTheme: EditorLightTheme;
  darkTheme: EditorDarkTheme;
  resolvedTheme: ResolvedTheme;
  startupFocusedMode: FocusedMode;
  undoDepth: number;
  redoDepth: number;
  historyLimit: number;
  onClose: () => void;
  onAddFont?: (family: DocumentFontFamily) => void;
  onRemoveFont?: (familyName: string) => void;
  onToggleFontFavorite?: (familyName: string) => void;
  onPurgeUnusedFonts?: () => void;
  onPreviewStickyChange: (value: boolean) => void;
  onSpacerVisibilityChange: (value: 'selected' | 'all') => void;
  onShowGridLanesChange: (value: boolean) => void;
  onShowDebugInfoChange: (value: boolean) => void;
  onSnapSettingsChange: (value: Partial<SnapSettings>) => void;
  onThemeModeChange: (value: ThemeMode) => void;
  onAccentColorChange: (value: string) => void;
  onLightThemeChange: (value: EditorLightTheme) => void;
  onDarkThemeChange: (value: EditorDarkTheme) => void;
  onStartupFocusedModeChange: (value: FocusedMode) => void;
  globalStickyElevation: boolean;
  onStickyElevationChange: (value: boolean) => void;
  onClearHistory: () => void;
  onHistoryLimitChange: (value: number) => void;
  onImport: (raw: string) => Promise<ActionResult> | ActionResult;
  onResetData: () => void;
  onResetAll: () => void;
  onSiteSettingsChange?: (patch: Partial<import('../model/types/site').SiteSettings>) => void;
  activeSection?: SettingsSectionId;
};

export function SettingsPanel({
  document,
  documentJson,
  previewSticky,
  animationPreview,
  onAnimationPreviewChange,
  spacerVisibility,
  showGridLanes,
  showDebugInfo,
  snapSettings,
  themeMode,
  accentColor,
  lightTheme,
  darkTheme,
  resolvedTheme,
  startupFocusedMode,
  undoDepth,
  redoDepth,
  historyLimit,
  onClose,
  onAddFont = () => undefined,
  onRemoveFont = () => undefined,
  onToggleFontFavorite = () => undefined,
  onPurgeUnusedFonts = () => undefined,
  onPreviewStickyChange,
  onSpacerVisibilityChange,
  onShowGridLanesChange,
  onShowDebugInfoChange,
  onSnapSettingsChange,
  onThemeModeChange,
  onAccentColorChange,
  onLightThemeChange,
  onDarkThemeChange,
  onStartupFocusedModeChange,
  globalStickyElevation,
  onStickyElevationChange,
  onClearHistory,
  onHistoryLimitChange,
  onImport,
  onResetData,
  onResetAll,
  onSiteSettingsChange,
  activeSection: activeSectionProp,
}: Props) {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(
    activeSectionProp ?? DEFAULT_SETTINGS_SECTION_ID,
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const displayRef = useRef<HTMLElement | null>(null);
  const defaultsRef = useRef<HTMLElement | null>(null);
  const fontsRef = useRef<HTMLElement | null>(null);
  const transferRef = useRef<HTMLElement | null>(null);
  const advancedRef = useRef<HTMLElement | null>(null);
  const shortcutsRef = useRef<HTMLElement | null>(null);
  const transfer = useSettingsTransferState({
    document,
    documentJson,
    onImport,
  });

  const sectionRefs = useMemo(
    () => ({
      display: displayRef,
      defaults: defaultsRef,
      fonts: fontsRef,
      transfer: transferRef,
      advanced: advancedRef,
      shortcuts: shortcutsRef,
    }),
    [],
  );

  useEffect(() => {
    if (!activeSectionProp) {
      return;
    }
    setActiveSection(activeSectionProp);
    const element = sectionRefs[activeSectionProp].current;
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeSectionProp, sectionRefs]);

  function scrollToSection(sectionId: SettingsSectionId) {
    const element = sectionRefs[sectionId].current;
    if (!element) {
      return;
    }
    setActiveSection(sectionId);
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function updateActiveSection() {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const candidates = SETTINGS_SECTION_META.map((section) => {
      const element = sectionRefs[section.id].current;
      if (!element) {
        return { id: section.id, distance: Number.POSITIVE_INFINITY };
      }
      return {
        id: section.id,
        distance: Math.abs(element.offsetTop - container.scrollTop - 16),
      };
    });

    candidates.sort((left, right) => left.distance - right.distance);
    setActiveSection(candidates[0]?.id ?? DEFAULT_SETTINGS_SECTION_ID);
  }

  return (
    <div
      role="dialog"
      aria-label="Settings"
      className="editor-settings-panel fixed left-1/2 top-1/2 w-[min(760px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-2xl shadow-[0_22px_64px_rgba(15,23,42,0.18)]"
    >
      <div className="editor-bg-surface editor-border-subtle overflow-hidden rounded-2xl border">
        <EditorPanelHeader
          icon={Settings}
          title="Settings"
          description="Controls, transfer, diagnostics."
          closeLabel="Close settings"
          onClose={onClose}
          className="px-5"
        />

        <div className="grid h-[min(76vh,680px)] min-h-0 grid-cols-[180px_minmax(0,1fr)]">
          <aside className="editor-bg-subtle editor-border-subtle border-r">
            <SettingsSectionNav
              activeSection={activeSection}
              onSelect={scrollToSection}
            />
          </aside>

          <div
            ref={scrollRef}
            className="editor-scrollbar min-h-0 overflow-y-auto"
            onScroll={updateActiveSection}
          >
            <div className="px-6 py-5">
              {SETTINGS_SECTION_META.map((section) => (
                <section
                  key={section.id}
                  ref={sectionRefs[section.id]}
                  data-settings-section={section.id}
                  className={getSectionClassName(section.id)}
                >
                  {renderSectionContent(section.id, {
                    document,
                    previewSticky,
                    animationPreview,
                    spacerVisibility,
                    showGridLanes,
                    showDebugInfo,
                    snapSettings,
                    themeMode,
                    accentColor,
                    lightTheme,
                    darkTheme,
                    resolvedTheme,
                    startupFocusedMode,
                    undoDepth,
                    redoDepth,
                    historyLimit,
                    globalStickyElevation,
                    transfer,
                    onAddFont,
                    onRemoveFont,
                    onToggleFontFavorite,
                    onPurgeUnusedFonts,
                    onPreviewStickyChange,
                    onAnimationPreviewChange,
                    onSpacerVisibilityChange,
                    onShowGridLanesChange,
                    onShowDebugInfoChange,
                    onSnapSettingsChange,
                    onThemeModeChange,
                    onAccentColorChange,
                    onLightThemeChange,
                    onDarkThemeChange,
                    onStartupFocusedModeChange,
                    onStickyElevationChange,
                    onClearHistory,
                    onHistoryLimitChange,
                    onResetData,
                    onResetAll,
                    onSiteSettingsChange,
                  })}
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getSectionClassName(sectionId: SettingsSectionId) {
  if (sectionId === 'display') {
    return 'editor-border-subtle border-b pb-6';
  }

  return 'editor-border-subtle border-b py-6';
}

function renderSectionContent(
  sectionId: SettingsSectionId,
  props: {
    document: DocumentModel;
    previewSticky: boolean;
    animationPreview: AnimationPreviewState;
    spacerVisibility: 'selected' | 'all';
    showGridLanes: boolean;
    showDebugInfo: boolean;
    snapSettings: SnapSettings;
    themeMode: ThemeMode;
    accentColor: string;
    lightTheme: EditorLightTheme;
    darkTheme: EditorDarkTheme;
    resolvedTheme: ResolvedTheme;
    startupFocusedMode: FocusedMode;
    undoDepth: number;
    redoDepth: number;
    historyLimit: number;
    globalStickyElevation: boolean;
    transfer: SettingsTransferState;
    onAddFont: (family: DocumentFontFamily) => void;
    onRemoveFont: (familyName: string) => void;
    onToggleFontFavorite: (familyName: string) => void;
    onPurgeUnusedFonts: () => void;
    onPreviewStickyChange: (value: boolean) => void;
    onAnimationPreviewChange: (value: Partial<AnimationPreviewState>) => void;
    onSpacerVisibilityChange: (value: 'selected' | 'all') => void;
    onShowGridLanesChange: (value: boolean) => void;
    onShowDebugInfoChange: (value: boolean) => void;
    onSnapSettingsChange: (value: Partial<SnapSettings>) => void;
    onThemeModeChange: (value: ThemeMode) => void;
    onAccentColorChange: (value: string) => void;
    onLightThemeChange: (value: EditorLightTheme) => void;
    onDarkThemeChange: (value: EditorDarkTheme) => void;
    onStartupFocusedModeChange: (value: FocusedMode) => void;
    onStickyElevationChange: (value: boolean) => void;
    onClearHistory: () => void;
    onHistoryLimitChange: (value: number) => void;
    onResetData: () => void;
    onResetAll: () => void;
    onSiteSettingsChange?: (patch: Partial<import('../model/types/site').SiteSettings>) => void;
  },
) {
  switch (sectionId) {
    case 'display':
      return (
        <DisplaySettingsSection
          previewSticky={props.previewSticky}
          animationPreview={props.animationPreview}
          spacerVisibility={props.spacerVisibility}
          showGridLanes={props.showGridLanes}
          showDebugInfo={props.showDebugInfo}
          snapSettings={props.snapSettings}
          themeMode={props.themeMode}
          accentColor={props.accentColor}
          lightTheme={props.lightTheme}
          darkTheme={props.darkTheme}
          resolvedTheme={props.resolvedTheme}
          startupFocusedMode={props.startupFocusedMode}
          onPreviewStickyChange={props.onPreviewStickyChange}
          onAnimationPreviewChange={props.onAnimationPreviewChange}
          onSpacerVisibilityChange={props.onSpacerVisibilityChange}
          onShowGridLanesChange={props.onShowGridLanesChange}
          onShowDebugInfoChange={props.onShowDebugInfoChange}
          onSnapSettingsChange={props.onSnapSettingsChange}
          onThemeModeChange={props.onThemeModeChange}
          onAccentColorChange={props.onAccentColorChange}
          onLightThemeChange={props.onLightThemeChange}
          onDarkThemeChange={props.onDarkThemeChange}
          onStartupFocusedModeChange={props.onStartupFocusedModeChange}
        />
      );
    case 'defaults':
      return (
        <DefaultsSettingsSection
          globalStickyElevation={props.globalStickyElevation}
          onStickyElevationChange={props.onStickyElevationChange}
        />
      );
    case 'fonts':
      return (
        <FontsSettingsSection
          document={props.document}
          onAddFont={props.onAddFont}
          onRemoveFont={props.onRemoveFont}
          onToggleFavorite={props.onToggleFontFavorite}
          onPurgeUnused={props.onPurgeUnusedFonts}
        />
      );
    case 'transfer':
      return (
        <TransferSettingsSection
          transfer={props.transfer}
          siteSettings={props.document.siteSettings}
          onSiteSettingsChange={props.onSiteSettingsChange}
        />
      );
    case 'advanced':
      return (
        <AdvancedSettingsSection
          undoDepth={props.undoDepth}
          redoDepth={props.redoDepth}
          historyLimit={props.historyLimit}
          onClearHistory={props.onClearHistory}
          onHistoryLimitChange={props.onHistoryLimitChange}
          onResetData={props.onResetData}
          onResetAll={props.onResetAll}
        />
      );
    case 'shortcuts':
      return <ShortcutsSettingsSection />;
  }
}
