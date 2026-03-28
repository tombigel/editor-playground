import type { ComponentProps } from 'react';
import { SectionHeading } from '@/components/ui/settings-panel';
import type { DocumentModel } from '@/api/editorApi';
import { ManageFontsPanel } from '@/panels/fontManagement/ManageFontsPanel';

type ManageFontsPanelProps = ComponentProps<typeof ManageFontsPanel>;

type FontsSettingsSectionProps = {
  document: DocumentModel;
  onAddFont: ManageFontsPanelProps['onAddFont'];
  onRemoveFont: ManageFontsPanelProps['onRemoveFont'];
  onToggleFavorite: ManageFontsPanelProps['onToggleFavorite'];
  onPurgeUnused: ManageFontsPanelProps['onPurgeUnused'];
};

export function FontsSettingsSection({
  document,
  onAddFont,
  onRemoveFont,
  onToggleFavorite,
  onPurgeUnused,
}: FontsSettingsSectionProps) {
  return (
    <>
      <SectionHeading
        eyebrow="Fonts"
        title="Site font library"
        description="Manage available families, favorites, and cleanup for this site."
      />
      <ManageFontsPanel
        document={document}
        onAddFont={onAddFont}
        onRemoveFont={onRemoveFont}
        onToggleFavorite={onToggleFavorite}
        onPurgeUnused={onPurgeUnused}
      />
    </>
  );
}
