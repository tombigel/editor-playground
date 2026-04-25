import { CheckCircle, ClipboardCopy, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { LinkValidationError, SiteSettings } from '@/api/editorApi';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ActionRow, PlainGroup } from '@/components/ui/settings-panel';
import { FormField } from './controls/FormLayout';

export function PagesExportSettingsContent({
  siteSettings,
  linkErrors,
  onSetSiteSettings,
  onValidateLinks,
}: {
  siteSettings: SiteSettings | undefined;
  linkErrors: LinkValidationError[] | null;
  onSetSiteSettings: (patch: Partial<SiteSettings>) => void;
  onValidateLinks: () => LinkValidationError[];
}) {
  const [copied, setCopied] = useState(false);

  function handleCopyResults() {
    if (!linkErrors) {
      return;
    }
    const text =
      linkErrors.length === 0
        ? 'No broken links found.'
        : linkErrors
            .map(
              (error) =>
                `[${error.nodeRole}] "${error.nodeName}" (${error.nodeId}): ${error.description}`,
            )
            .join('\n');
    void navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <PlainGroup title="Routing and validation">
      <FormField label="Output structure" layout="inline">
        <Select
          value={siteSettings?.outputStructure ?? 'directory'}
          onValueChange={(value) =>
            onSetSiteSettings({
              outputStructure: value as SiteSettings['outputStructure'],
            })
          }
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="directory">Directory (about/index.html)</SelectItem>
            <SelectItem value="flat">Flat (about.html)</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <ActionRow
        title="Validate links"
        description="Checks page links, page anchors, and section anchors across the document."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={onValidateLinks}>
            Validate links
          </Button>
        }
      />

      {linkErrors ? (
        <div className="editor-border-subtle rounded-lg border">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1.5">
              {linkErrors.length === 0 ? (
                <CheckCircle className="editor-text-strong h-3.5 w-3.5" />
              ) : (
                <XCircle className="editor-warning-text h-3.5 w-3.5" />
              )}
              <span className="editor-text-strong text-xs font-medium">
                {linkErrors.length === 0
                  ? 'No broken links found'
                  : `${linkErrors.length} broken link${linkErrors.length === 1 ? '' : 's'}`}
              </span>
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-1.5 text-xs" onClick={handleCopyResults}>
              <ClipboardCopy className="h-3 w-3" />
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          {linkErrors.length > 0 ? (
            <ul className="editor-border-subtle border-t">
              {linkErrors.map((error) => (
                <li key={error.nodeId + error.errorType} className="editor-border-subtle border-b px-3 py-2 last:border-b-0">
                  <div className="editor-text-strong text-xs font-medium">
                    {error.nodeName}
                    <span className="editor-text-muted ml-1 font-normal">({error.nodeRole})</span>
                  </div>
                  <div className="editor-text-muted mt-0.5 text-xs">{error.description}</div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </PlainGroup>
  );
}
