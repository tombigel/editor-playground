import { X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  closeLabel: string;
  onClose: () => void;
  className?: string;
};

export function EditorPanelHeader({
  icon: Icon,
  title,
  description,
  closeLabel,
  onClose,
  className,
}: Props) {
  return (
    <div className={`editor-panel-header editor-border-subtle flex items-center justify-between gap-4 border-b px-4 py-3 ${className ?? ''}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="editor-panel-header-icon editor-icon-surface flex h-9 w-9 items-center justify-center rounded-xl border">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="editor-panel-header-title editor-text-strong text-sm font-medium">{title}</div>
          {description ? <div className="editor-panel-header-description editor-text-muted text-xs">{description}</div> : null}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="editor-panel-header-close editor-icon-button-subtle rounded-lg border"
        onClick={onClose}
        aria-label={closeLabel}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
