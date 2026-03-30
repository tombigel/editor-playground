import { Pin } from 'lucide-react';
import { SectionHeading, SettingRow } from '@/components/ui/settings-panel';

type DefaultsSettingsSectionProps = {
  globalStickyElevation: boolean;
  onStickyElevationChange: (value: boolean) => void;
};

export function DefaultsSettingsSection({
  globalStickyElevation,
  onStickyElevationChange,
}: DefaultsSettingsSectionProps) {
  return (
    <>
      <SectionHeading
        eyebrow="Defaults"
        title="Document defaults"
        description="Default behaviors applied across the document."
      />
      <SettingRow
        icon={Pin}
        title="Elevate all stickies"
        description="Globally elevate sticky elements above siblings."
        checked={globalStickyElevation}
        onCheckedChange={onStickyElevationChange}
      />
    </>
  );
}
