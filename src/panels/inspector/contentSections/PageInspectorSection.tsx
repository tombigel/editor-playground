import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, InspectorInlineRow } from '../../controls/FormLayout';
import { InspectorSectionCard } from '../CommonSections';
import type { DocumentModel } from '../../../model/types';
import type { DocumentPage, PageId } from '../../../model/types/site';

export type PageInspectorSectionProps = {
  page: DocumentPage;
  document: DocumentModel;
  onSetDisplayName: (pageId: PageId, name: string) => void;
  onSetSlug: (pageId: PageId, slug: string) => void;
  onSetVisibility: (pageId: PageId, visible: boolean) => void;
  onSetViewTransition: (pageId: PageId, transition: DocumentPage['viewTransition']) => void;
  onOpenPageSettings: () => void;
  onOpenPagesPanel: () => void;
};

export function PageInspectorSection({
  page,
  document,
  onSetDisplayName,
  onSetSlug: _onSetSlug,
  onSetVisibility,
  onSetViewTransition,
  onOpenPageSettings,
  onOpenPagesPanel,
}: PageInspectorSectionProps) {
  const viewTransition = page.viewTransition ?? '__inherit__';
  const inheritedTransition = document.siteSettings?.viewTransition ?? 'none';

  return (
    <InspectorSectionCard
      title="Page"
      contentClassName="space-y-3 px-3 pt-2 pb-3"
    >
      <FormField label="Display name">
        <Input
          value={page.displayName}
          onChange={(e) => onSetDisplayName(page.id, e.target.value)}
          placeholder="Page name"
        />
      </FormField>

      <InspectorInlineRow label="Slug">
        <div className="editor-bg-subtle editor-border-subtle flex min-w-0 items-center justify-between gap-2 rounded-md border px-2 py-1.5">
          <span className="editor-text-muted min-w-0 truncate font-mono text-[11px]">{page.slug || '/'}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={onOpenPageSettings}
            aria-label="Open page settings"
          >
            Edit
          </Button>
        </div>
      </InspectorInlineRow>

      <InspectorInlineRow label="Visible">
        <Switch
          checked={page.visible}
          onCheckedChange={(value) => onSetVisibility(page.id, value)}
        />
      </InspectorInlineRow>

      <InspectorInlineRow label="Transition">
        <Select
          value={viewTransition}
          onValueChange={(value) => {
            const nextTransition =
              value === '__inherit__'
                ? undefined
                : (value as DocumentPage['viewTransition']);
            onSetViewTransition(page.id, nextTransition);
          }}
        >
          <SelectTrigger className="h-7 text-[11px]">
            <span className="truncate text-left">
              {VIEW_TRANSITION_LABELS[viewTransition] ?? viewTransition}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__inherit__">
              {`Inherit from site (${VIEW_TRANSITION_LABELS[inheritedTransition] ?? inheritedTransition})`}
            </SelectItem>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="crossfade">Cross-fade</SelectItem>
            <SelectItem value="slide">Slide</SelectItem>
          </SelectContent>
        </Select>
      </InspectorInlineRow>

      <div className="editor-border-subtle flex items-center gap-2 border-t pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 flex-1 text-xs"
          onClick={onOpenPageSettings}
        >
          Page settings&hellip;
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 flex-1 text-xs"
          onClick={onOpenPagesPanel}
        >
          All pages&hellip;
        </Button>
      </div>
    </InspectorSectionCard>
  );
}

const VIEW_TRANSITION_LABELS: Record<'__inherit__' | NonNullable<DocumentPage['viewTransition']>, string> = {
  __inherit__: 'Inherit from site',
  none: 'None',
  crossfade: 'Cross-fade',
  slide: 'Slide',
};
