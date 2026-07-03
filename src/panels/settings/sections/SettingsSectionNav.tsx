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
    <div className="sticky top-0 px-2 py-3">
      <div className="editor-text-muted mb-2 px-2 text-[11px] font-medium">
        On This Page
      </div>
      <nav className="space-y-0.5">
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
              className="gap-2 px-2 py-2"
              titleClassName="text-[13px]"
              descriptionClassName="text-[11px] leading-4"
            />
          );
        })}
      </nav>
    </div>
  );
}
