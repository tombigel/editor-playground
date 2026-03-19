import { Keyboard } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EditorPanelHeader } from './EditorPanelHeader';
import { ShortcutHelpContent } from './ShortcutHelpContent';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShortcutHelpDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        backdropVariant="transparent"
        surfaceClassName="bg-transparent p-5 backdrop-blur-none"
        className="editor-shortcut-help max-h-[calc(100vh-1.5rem)] max-w-4xl gap-0 overflow-hidden p-0"
      >
        <EditorPanelHeader
          icon={Keyboard}
          title="Keyboard Shortcuts"
          description="Shortcut reference from the shared editor registry."
          closeLabel="Close keyboard shortcuts"
          onClose={() => onOpenChange(false)}
        />
        <div className="editor-scrollbar overflow-y-auto p-5 pt-4">
          <ShortcutHelpContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
