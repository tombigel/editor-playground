import {
  ArrowDownToLine,
  Eye,
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
import { SnapSettingsGroup } from '../SnapSettingsGroup';
import {
  AccentSwatchRow,
  FocusedModeStartupRow,
  ThemePresetRow,
} from '../SettingsShared';

type DisplaySettingsSectionProps = {
  previewSticky: boolean;
  animationPreview: AnimationPreviewState;
  spacerVisibility: 'selected' | 'all';
  showGridLanes: boolean;
  snapSettings: SnapSettings;
  themeMode: ThemeMode;
  accentColor: string;
  lightTheme: EditorLightTheme;
  darkTheme: EditorDarkTheme;
  resolvedTheme: ResolvedTheme;
  startupFocusedMode: FocusedMode;
  onPreviewStickyChange: (value: boolean) => void;
  onAnimationPreviewChange: (value: Partial<AnimationPreviewState>) => void;
  onSpacerVisibilityChange: (value: 'selected' | 'all') => void;
  onShowGridLanesChange: (value: boolean) => void;
  onSnapSettingsChange: (value: Partial<SnapSettings>) => void;
  onThemeModeChange: (value: ThemeMode) => void;
  onAccentColorChange: (value: string) => void;
  onLightThemeChange: (value: EditorLightTheme) => void;
  onDarkThemeChange: (value: EditorDarkTheme) => void;
  onStartupFocusedModeChange: (value: FocusedMode) => void;
};

export function DisplaySettingsSection({
  previewSticky,
  animationPreview,
  spacerVisibility,
  showGridLanes,
  snapSettings,
  themeMode,
  accentColor,
  lightTheme,
  darkTheme,
  resolvedTheme,
  startupFocusedMode,
  onPreviewStickyChange,
  onAnimationPreviewChange,
  onSpacerVisibilityChange,
  onShowGridLanesChange,
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
            window.location.hash = '#/design-system';
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
    </>
  );
}
