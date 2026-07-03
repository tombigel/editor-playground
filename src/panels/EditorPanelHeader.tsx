import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { PanelHeader } from '@/components/ui/panel-header';

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  closeLabel: string;
  onClose: () => void;
  closeTooltip?: boolean;
  className?: string;
  actions?: ReactNode;
};

export function EditorPanelHeader({
  icon: Icon,
  title,
  description,
  closeLabel,
  onClose,
  closeTooltip,
  className,
  actions,
}: Props) {
  return (
    <PanelHeader
      icon={<Icon className="h-4 w-4" />}
      title={title}
      description={description}
      closeLabel={closeLabel}
      onClose={onClose}
      closeTooltip={closeTooltip}
      className={className}
      actions={actions}
    />
  );
}
