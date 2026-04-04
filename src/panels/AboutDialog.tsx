import { Info } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AboutContent } from './AboutContent';
import { EditorPanelHeader } from './EditorPanelHeader';

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
        <AboutContent />
      </DialogContent>
    </Dialog>
  );
}
