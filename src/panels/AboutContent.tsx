import { Button } from '@/components/ui/button';
import { PROJECT_VERSION, DOCUMENT_MODEL_VERSION, API_VERSION, EDITOR_VERSION } from '../lib/version';

const ABOUT_LINKS = [
  { label: 'Getting Started', entryId: 'doc:docs/GETTING_STARTED.md' },
  { label: 'Reference Overview', entryId: 'doc:docs/REFERENCE.md' },
  { label: 'API Reference', entryId: 'doc:docs/API.md' },
  { label: 'Playground Spec', entryId: 'doc:docs/PLAYGROUND_SPEC.md' },
] as const;

const VERSIONS = [
  { label: 'Project', value: PROJECT_VERSION },
  { label: 'Document model', value: DOCUMENT_MODEL_VERSION },
  { label: 'API', value: API_VERSION },
  { label: 'Editor', value: EDITOR_VERSION },
] as const;

export function AboutContent({ onOpenHelpEntry }: { onOpenHelpEntry?: (entryId: string) => void } = {}) {
  return (
    <div className="space-y-5 p-6">
      <div className="space-y-2">
        <div className="editor-text-strong text-sm font-semibold">Editor Playground</div>
        <p className="editor-text-muted text-sm leading-6">
          A multi-page visual editor for sticky behavior, page authoring, preview, and export.
        </p>
      </div>
      <div className="editor-bg-subtle editor-border-subtle rounded-xl border p-4">
        <div className="editor-text-muted text-[11px] font-medium uppercase tracking-[0.12em]">
          Versions
        </div>
        <div className="mt-3 space-y-2">
          {VERSIONS.map((v) => (
            <div key={v.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="editor-text-strong">{v.label}</span>
              <span className="editor-text-muted font-mono text-[11px]">{v.value}</span>
            </div>
          ))}
        </div>
        {onOpenHelpEntry && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-3 h-auto w-full justify-start px-0 py-1 text-left text-sm text-[color:var(--editor-accent)] underline underline-offset-2"
            onClick={() => onOpenHelpEntry('doc:CHANGELOG.md')}
          >
            Changelog
          </Button>
        )}
      </div>
      <div className="editor-bg-subtle editor-border-subtle rounded-xl border p-4">
        <div className="editor-text-muted text-[11px] font-medium uppercase tracking-[0.12em]">
          Documentation
        </div>
        <div className="mt-3 space-y-1">
          {ABOUT_LINKS.map((link) => (
            <Button
              key={link.entryId}
              type="button"
              variant="ghost"
              size="sm"
              data-help-entry-target={link.entryId}
              className="h-auto w-full justify-start px-0 py-1 text-left text-sm text-[color:var(--editor-accent)] underline underline-offset-2"
              onClick={() => onOpenHelpEntry?.(link.entryId)}
            >
              {link.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
