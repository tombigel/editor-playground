import { Keyboard } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EditorPanelHeader } from './EditorPanelHeader';
import { ShortcutHelpContent } from './ShortcutHelpContent';

export function ShortcutsDialog({
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
        className="editor-shortcut-help max-h-[calc(100vh-2rem)] max-w-[min(760px,calc(100vw-32px))] gap-0 overflow-hidden p-0"
      >
        <EditorPanelHeader
          icon={Keyboard}
          title="Shortcuts"
          description="Keyboard and pointer reference."
          closeLabel="Close shortcuts"
          onClose={() => onOpenChange(false)}
        />
        <div className="editor-scrollbar max-h-[min(72vh,640px)] overflow-y-auto p-6">
          <ShortcutHelpContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
