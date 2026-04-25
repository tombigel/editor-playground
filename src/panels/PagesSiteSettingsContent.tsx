import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { FormField } from './controls/FormLayout';
import type { SiteSettings } from '@/api/editorApi';
import { createLanguageSelectOptions, getDefaultSiteLanguage } from '@/i18n/languages';
import { ControlGroup, LabeledFieldStack, PlainGroup, SectionHeading } from '@/components/ui/settings-panel';

export function PagesSiteSettingsContent({
  siteSettings,
  onSetSiteSettings,
  className = '',
}: {
  siteSettings: SiteSettings | undefined;
  onSetSiteSettings: (patch: Partial<SiteSettings>) => void;
  className?: string;
}) {
  const resolvedLanguage = siteSettings?.lang ?? getDefaultSiteLanguage();
  const languageOptions = createLanguageSelectOptions();

  return (
    <div className={`flex flex-col gap-4 ${className}`.trim()}>
      <SectionHeading
        eyebrow="Pages"
        title="Site page settings"
        description="Defaults for page transitions, language, and slug behavior."
      />

      <PlainGroup title="Site defaults">
        <LabeledFieldStack label="Title" labelClassName="editor-text-muted text-xs">
          <Input
            defaultValue={siteSettings?.title ?? ''}
            key={siteSettings?.title}
            className="editor-bg-surface editor-border-subtle editor-text-strong"
            placeholder="My Site"
            onBlur={(event) => {
              const value = event.currentTarget.value.trim();
              onSetSiteSettings({ title: value || undefined });
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
          />
        </LabeledFieldStack>

        <ControlGroup separated>
          <FormField label="Site transition" layout="inline">
            <Select
              value={siteSettings?.viewTransition ?? 'none'}
              onValueChange={(value) =>
                onSetSiteSettings({
                  viewTransition: value as SiteSettings['viewTransition'],
                })
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="crossfade">Cross-fade</SelectItem>
                <SelectItem value="slide">Slide</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Site language" layout="inline">
            <SearchableSelect
              value={resolvedLanguage}
              options={languageOptions}
              placeholder="Choose language"
              searchPlaceholder="Search languages"
              triggerClassName="h-7 text-xs"
              onValueChange={(value) => onSetSiteSettings({ lang: value })}
            />
          </FormField>

          <FormField label="Auto-sync slugs" layout="inline">
            <Switch
              checked={siteSettings?.autoSyncSlugs ?? true}
              onCheckedChange={(checked) => onSetSiteSettings({ autoSyncSlugs: checked })}
            />
          </FormField>
        </ControlGroup>
      </PlainGroup>
    </div>
  );
}
