import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShortcutHelpContent } from './ShortcutHelpContent';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShortcutHelpDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        backdropVariant="transparent"
        surfaceClassName="bg-transparent p-5 backdrop-blur-none"
        className="editor-shortcut-help max-h-[calc(100vh-1.5rem)] max-w-4xl gap-3 overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Shortcut reference from the shared editor registry.</DialogDescription>
        </DialogHeader>
        <ShortcutHelpContent />
      </DialogContent>
    </Dialog>
  );
}
