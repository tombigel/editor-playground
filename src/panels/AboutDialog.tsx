import { Info } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EditorPanelHeader } from './EditorPanelHeader';

const ABOUT_LINKS = [
  { label: 'Playground spec', href: 'docs/PLAYGROUND_SPEC.md' },
  { label: 'Editor style guide', href: 'docs/EDITOR_STYLE_GUIDE.md' },
  { label: 'API reference', href: 'docs/API.md' },
] as const;

export function AboutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        backdropVariant="transparent"
        surfaceClassName="bg-transparent p-5 backdrop-blur-none"
        className="max-w-[min(520px,calc(100vw-32px))] gap-0 overflow-hidden p-0"
      >
        <EditorPanelHeader
          icon={Info}
          title="About"
          description="Sticky Playground editor shell."
          closeLabel="Close about"
          onClose={() => onOpenChange(false)}
        />
        <div className="space-y-5 p-6">
          <div className="space-y-2">
            <div className="editor-text-strong text-sm font-semibold">Sticky Playground</div>
            <p className="editor-text-muted text-sm leading-6">
              A multi-page visual editor for sticky behavior, page authoring, preview, and export.
            </p>
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
      </DialogContent>
    </Dialog>
  );
}
