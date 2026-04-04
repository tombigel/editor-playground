import { Settings2 } from 'lucide-react';
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
  onSetDisplayName,
  onSetSlug,
  onSetVisibility,
  onSetViewTransition,
  onOpenPageSettings,
  onOpenPagesPanel,
}: PageInspectorSectionProps) {
  const viewTransition = page.viewTransition ?? 'none';

  return (
    <InspectorSectionCard
      title="Page"
      contentClassName="space-y-2.5 px-3 pt-1.5 pb-3"
      headerAction={{
        ariaLabel: 'Manage page settings',
        icon: <Settings2 className="h-3.5 w-3.5" />,
        onClick: onOpenPageSettings,
      }}
    >
      <FormField label="Display name">
        <Input
          value={page.displayName}
          onChange={(e) => onSetDisplayName(page.id, e.target.value)}
          placeholder="Page name"
        />
      </FormField>

      <InspectorInlineRow label="Slug">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="editor-text-muted min-w-0 truncate font-mono text-[11px]">{page.slug || '/'}</span>
          <button
            type="button"
            className="editor-text-accent shrink-0 text-[11px] underline hover:no-underline"
            onClick={onOpenPageSettings}
            aria-label="Edit slug"
          >
            edit
          </button>
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
          onValueChange={(value) =>
            onSetViewTransition(page.id, value as DocumentPage['viewTransition'])
          }
        >
          <SelectTrigger className="h-7 text-[11px]">
            <span className="truncate text-left">
              {VIEW_TRANSITION_LABELS[viewTransition] ?? viewTransition}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="crossfade">Cross-fade</SelectItem>
            <SelectItem value="slide">Slide</SelectItem>
          </SelectContent>
        </Select>
      </InspectorInlineRow>

      <div className="editor-border-subtle border-t pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-full text-xs"
          onClick={onOpenPagesPanel}
        >
          All pages&hellip;
        </Button>
      </div>
    </InspectorSectionCard>
  );
}

const VIEW_TRANSITION_LABELS: Record<NonNullable<DocumentPage['viewTransition']>, string> = {
  none: 'None',
  crossfade: 'Cross-fade',
  slide: 'Slide',
};
