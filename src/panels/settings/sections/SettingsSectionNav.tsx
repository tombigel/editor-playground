import { SETTINGS_SECTION_META, type SettingsSectionId } from '../settingsSections';
import { SettingsNavItem } from '@/components/ui/settings-panel';

type SettingsSectionNavProps = {
  activeSection: SettingsSectionId;
  onSelect: (sectionId: SettingsSectionId) => void;
};

export function SettingsSectionNav({
  activeSection,
  onSelect,
}: SettingsSectionNavProps) {
  return (
    <div className="sticky top-0 px-3 py-4">
      <div className="editor-text-muted mb-3 px-2 text-[11px] font-medium">
        On This Page
      </div>
      <nav className="space-y-1">
        {SETTINGS_SECTION_META.map((section) => {
          const Icon = section.icon;
          const active = activeSection === section.id;

          return (
            <SettingsNavItem
              key={section.id}
              data-settings-nav={section.id}
              onClick={() => onSelect(section.id)}
              active={active}
              icon={<Icon className="h-4 w-4" />}
              title={section.label}
              description={section.description}
            />
          );
        })}
      </nav>
    </div>
  );
}
