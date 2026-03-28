import { SETTINGS_SECTION_META, type SettingsSectionId } from '../settingsSections';

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
            <button
              key={section.id}
              type="button"
              data-settings-nav={section.id}
              onClick={() => onSelect(section.id)}
              data-active={active ? 'true' : 'false'}
              className={`settings-nav-link flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--editor-focus-ring-strong)] focus-visible:ring-inset ${
                active ? 'shadow-sm' : ''
              }`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium">{section.label}</div>
                <div className="settings-nav-link-copy mt-0.5 text-xs leading-5">
                  {section.description}
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
