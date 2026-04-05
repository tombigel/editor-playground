import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { InspectorInlineRow } from './controls/FormLayout';
import type { SiteSettings } from '@/api/editorApi';
import { createLanguageSelectOptions, getDefaultSiteLanguage } from '@/i18n/languages';
import { PlainGroup, SectionHeading } from '@/components/ui/settings-panel';

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
        <div className="flex flex-col gap-1.5">
          <Label className="editor-text-muted text-xs">Title</Label>
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
        </div>

        <div className="editor-border-subtle space-y-2.5 border-t pt-4">
          <InspectorInlineRow label="Site transition">
            <Select
              value={siteSettings?.viewTransition ?? 'none'}
              onValueChange={(value) =>
                onSetSiteSettings({
                  viewTransition: value as SiteSettings['viewTransition'],
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="crossfade">Cross-fade</SelectItem>
                <SelectItem value="slide">Slide</SelectItem>
              </SelectContent>
            </Select>
          </InspectorInlineRow>

          <InspectorInlineRow label="Site language">
            <SearchableSelect
              value={resolvedLanguage}
              options={languageOptions}
              placeholder="Choose language"
              searchPlaceholder="Search languages"
              triggerClassName="h-8 text-xs"
              onValueChange={(value) => onSetSiteSettings({ lang: value })}
            />
          </InspectorInlineRow>

          <InspectorInlineRow label="Auto-sync slugs">
            <Switch
              checked={siteSettings?.autoSyncSlugs ?? true}
              onCheckedChange={(checked) => onSetSiteSettings({ autoSyncSlugs: checked })}
            />
          </InspectorInlineRow>
        </div>
      </PlainGroup>
    </div>
  );
}
