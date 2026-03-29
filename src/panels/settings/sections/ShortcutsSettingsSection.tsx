import { SectionHeading } from '@/components/ui/settings-panel';
import { ShortcutHelpContent } from '@/panels/ShortcutHelpContent';

export function ShortcutsSettingsSection() {
  return (
    <>
      <SectionHeading
        eyebrow="Shortcuts"
        title="Keyboard and pointer reference"
        description="The same guide available from the Help browser."
      />
      <ShortcutHelpContent compact />
    </>
  );
}
