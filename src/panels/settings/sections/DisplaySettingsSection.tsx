import {
  ArrowDownToLine,
  Bug,
  Eye,
  Ghost,
  Grid3X3,
  Play,
  SwatchBook,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHeading, SettingRow } from '@/components/ui/settings-panel';
import type { FocusedMode } from '@/api/editorApi';
import type {
  AnimationPreviewState,
  SnapSettings,
} from '@/editor/types';
import type {
  EditorDarkTheme,
  EditorLightTheme,
  ResolvedTheme,
  ThemeMode,
} from '@/lib/theme';
import { openDesignSystemShowcase } from '@/lib/designSystem';
import { SnapSettingsGroup } from '../SnapSettingsGroup';
import {
  AccentSwatchRow,
  FocusedModeStartupRow,
  ThemePresetRow,
} from '../SettingsShared';

type DisplaySettingsSectionProps = {
  showHidden?: boolean;
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
  onShowHiddenChange?: (value: boolean) => void;
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
};

export function DisplaySettingsSection({
  showHidden = true,
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
  onShowHiddenChange = () => undefined,
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
}: DisplaySettingsSectionProps) {
  const spacerToggleOn = spacerVisibility === 'all';

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <SectionHeading
          eyebrow="UI"
          title="Appearance and guides"
          description="Theme, stage toggles, and guides."
        />
        <Button
          variant="outline"
          size="sm"
          className="mt-3 shrink-0 gap-1.5"
          onClick={() => {
            openDesignSystemShowcase({
              themeMode,
              accentColor,
              lightTheme,
              darkTheme,
            });
          }}
        >
          <SwatchBook className="h-3.5 w-3.5" />
          Design System
        </Button>
      </div>
      <ThemePresetRow
        themeMode={themeMode}
        resolvedTheme={resolvedTheme}
        lightTheme={lightTheme}
        darkTheme={darkTheme}
        onThemeModeChange={onThemeModeChange}
        onLightThemeChange={onLightThemeChange}
        onDarkThemeChange={onDarkThemeChange}
      />
      <AccentSwatchRow value={accentColor} onChange={onAccentColorChange} />
      <FocusedModeStartupRow
        value={startupFocusedMode}
        onChange={onStartupFocusedModeChange}
      />
      <SettingRow
        icon={Ghost}
        title="Show Hidden"
        description="Shows hidden components and wrappers as stage ghosts."
        checked={showHidden}
        onCheckedChange={onShowHiddenChange}
        tooltip="On shows hidden nodes as ghosts. Off hides them until selected from Components."
      />
      <SettingRow
        icon={Eye}
        title="Sticky preview"
        description="Applies CSS sticky behavior in preview."
        checked={previewSticky}
        onCheckedChange={onPreviewStickyChange}
      />
      <SettingRow
        icon={Play}
        title="Animation preview"
        description="Runs animations live in the editor stage."
        checked={animationPreview.enabled}
        onCheckedChange={(value) => onAnimationPreviewChange({ enabled: value })}
      />
      <SettingRow
        icon={ArrowDownToLine}
        title="Show spacers"
        description={
          spacerToggleOn
            ? 'Shows spacer visuals for all sticky nodes.'
            : 'Shows spacer visuals for the current selection.'
        }
        checked={spacerToggleOn}
        onCheckedChange={(checked) =>
          onSpacerVisibilityChange(checked ? 'all' : 'selected')
        }
        tooltip="On shows all spacer guides. Off scopes them to the current selection."
      />
      <SettingRow
        icon={Grid3X3}
        title="Grid lanes"
        description="Shows mesh guides inside wrappers."
        checked={showGridLanes}
        onCheckedChange={onShowGridLanesChange}
      />
      <SnapSettingsGroup
        snapSettings={snapSettings}
        onSnapSettingsChange={onSnapSettingsChange}
      />
      <SettingRow
        icon={Bug}
        title="Show debug info"
        description="Adds a compact diagnostics card to the inspector and logs node changes to the console."
        checked={showDebugInfo}
        onCheckedChange={onShowDebugInfoChange}
      />
    </>
  );
}
