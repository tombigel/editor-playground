import { PROJECT_VERSION, DOCUMENT_MODEL_VERSION, API_VERSION, EDITOR_VERSION } from '../lib/version';

const ABOUT_LINKS = [
  { label: 'Usage', href: 'docs/USAGE.md' },
  { label: 'Reference', href: 'docs/REFERENCE.md' },
  { label: 'Playground spec', href: 'docs/PLAYGROUND_SPEC.md' },
  { label: 'API reference', href: 'docs/API.md' },
] as const;

const VERSIONS = [
  { label: 'Project', value: PROJECT_VERSION },
  { label: 'Document model', value: DOCUMENT_MODEL_VERSION },
  { label: 'API', value: API_VERSION },
  { label: 'Editor', value: EDITOR_VERSION },
] as const;

export function AboutContent() {
  return (
    <div className="space-y-5 p-6">
      <div className="space-y-2">
        <div className="editor-text-strong text-sm font-semibold">Sticky Playground</div>
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
      </div>
      <div className="editor-bg-subtle editor-border-subtle rounded-xl border p-4">
        <div className="editor-text-muted text-[11px] font-medium uppercase tracking-[0.12em]">
          Documentation
        </div>
        <div className="mt-3 space-y-2">
          {ABOUT_LINKS.map((link) => (
            <div key={link.href} className="flex items-center justify-between gap-3 text-sm">
              <span className="editor-text-strong">{link.label}</span>
              <span className="editor-text-muted font-mono text-[11px]">{link.href}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
