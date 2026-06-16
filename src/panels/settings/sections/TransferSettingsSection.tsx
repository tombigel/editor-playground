import {
  ArrowUpFromLine,
  Clipboard,
  FileDown,
  FileUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ActionRow,
  ControlGroup,
  LabeledControlRow,
  PlainGroup,
  SectionHeading,
} from '@/components/ui/settings-panel';
import { Textarea } from '@/components/ui/textarea';
import {
  StatusMessage,
  TransferSubsection,
} from '../SettingsShared';
import type { SettingsTransferState } from '../useSettingsTransferState';
import type { SiteSettings, LinkValidationError } from '../../../api/documentViewApi';
import { PagesExportSettingsContent } from '../../PagesExportSettingsContent';

type TransferSettingsSectionProps = {
  transfer: SettingsTransferState;
  siteSettings?: SiteSettings;
  onSiteSettingsChange?: (patch: Partial<SiteSettings>) => void;
  linkErrors: LinkValidationError[] | null;
  onValidateLinks: () => LinkValidationError[];
};

export function TransferSettingsSection({
  transfer,
  siteSettings,
  onSiteSettingsChange,
  linkErrors,
  onValidateLinks,
}: TransferSettingsSectionProps) {
  const status = siteSettings?.status ?? 'draft';

  return (
    <>
      <SectionHeading
        eyebrow="Import / Export"
        title="Document transfer"
        description="Import JSON or export the current document as JSON or a rendered site ZIP."
      />

      <PlainGroup title="Site">
        <ControlGroup className="space-y-2">
          <LabeledControlRow label="Status">
            <div className="editor-bg-subtle editor-border-subtle inline-flex rounded-lg border p-0.5">
              <Button
                type="button"
                variant={status === 'draft' ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2.5 text-[11px]"
                onClick={() => onSiteSettingsChange?.({ status: 'draft' })}
              >
                Draft
              </Button>
              <Button
                type="button"
                variant={status === 'published' ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2.5 text-[11px]"
                onClick={() => onSiteSettingsChange?.({ status: 'published' })}
              >
                Published
              </Button>
            </div>
          </LabeledControlRow>
        </ControlGroup>
      </PlainGroup>
      <PlainGroup title="Export">
        <div className="space-y-4">
          <TransferSubsection
            title="Base file name"
            description="Used for fallback downloads and as the suggested native save name. JSON exports use `.json`; rendered site exports use `.zip`."
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_280px] sm:items-center">
              <Input
                value={transfer.exportFileName}
                onChange={(event) => transfer.setExportFileName(event.target.value)}
                placeholder="editor-playground"
                className="text-sm"
              />
            </div>
          </TransferSubsection>

          <TransferSubsection
            title="Document JSON"
            description="Model export for re-importing into the editor."
          >
            <ActionRow
              icon={FileDown}
              title="Save JSON"
              description="Uses the browser save picker when available, otherwise downloads a `.json` file."
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={transfer.handleSaveExport}
                >
                  Save JSON
                </Button>
              }
            />
            <ActionRow
              icon={Clipboard}
              title="Copy JSON"
              description="Copies the current document model to the clipboard."
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={transfer.handleCopyExport}
                >
                  Copy JSON
                </Button>
              }
            />
          </TransferSubsection>

          <TransferSubsection
            title="Rendered Site"
            description="Generated site structure export for hosting or SSR."
          >
            <PagesExportSettingsContent
              siteSettings={siteSettings}
              linkErrors={linkErrors}
              onSetSiteSettings={(patch) => onSiteSettingsChange?.(patch)}
              onValidateLinks={onValidateLinks}
            />
            <ActionRow
              icon={FileDown}
              title="Save site ZIP"
              description="Exports the rendered site as one ZIP archive containing the generated HTML and CSS bundle."
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={transfer.handleSaveSiteZip}
                >
                  Save Site ZIP
                </Button>
              }
            />
          </TransferSubsection>
        </div>
        <StatusMessage
          result={transfer.exportStatus}
          fallback="Exports include document JSON or a rendered site ZIP containing separate HTML and CSS files."
        />
      </PlainGroup>

      <PlainGroup title="Import" className="mt-6">
        <TransferSubsection
          title="Document JSON"
          description="Bring a saved document model back into the editor."
        >
          <ActionRow
            icon={FileUp}
            title="Import from file"
            description="Replaces the current document from a JSON file."
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => transfer.fileInputRef.current?.click()}
              >
                Choose file
              </Button>
            }
          />
          <ActionRow
            icon={Clipboard}
            title="Paste from clipboard"
            description="Pastes JSON into the import editor."
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={transfer.handlePasteFromClipboard}
              >
                Paste
              </Button>
            }
          />
          <input
            ref={transfer.fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={transfer.handleFileSelection}
          />
          <div className="editor-border-subtle mt-4 border-t pt-4">
            <div className="editor-text-muted mb-2 text-xs font-medium">
              Imported JSON
            </div>
            <Textarea
              value={transfer.importBuffer}
              onChange={(event) => transfer.setImportBuffer(event.target.value)}
              placeholder="Paste exported document JSON here."
              className="min-h-[220px] rounded-lg font-mono text-xs leading-5"
            />
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="editor-text-muted max-w-[420px] text-xs leading-5">
                Import validates, normalizes, replaces the active document, and
                supports undo.
              </div>
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                onClick={transfer.handleImportBuffer}
                disabled={transfer.importBuffer.trim().length === 0}
              >
                <ArrowUpFromLine className="h-4 w-4" />
                Import JSON
              </Button>
            </div>
          </div>
        </TransferSubsection>
        <StatusMessage
          result={transfer.importStatus}
          fallback="Invalid JSON leaves the current stage unchanged."
        />
      </PlainGroup>
    </>
  );
}
