import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const LIST_CARD_TONE_CLASSES = {
  default: '',
  subtle: 'editor-bg-subtle',
} as const;

export function ListCard({
  title,
  description,
  meta,
  actions,
  tone = 'default',
  className,
  titleClassName,
  descriptionClassName,
  metaClassName,
  titleStyle,
  descriptionStyle,
}: {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  tone?: keyof typeof LIST_CARD_TONE_CLASSES;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  metaClassName?: string;
  titleStyle?: CSSProperties;
  descriptionStyle?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        LIST_CARD_TONE_CLASSES[tone],
        'editor-border-subtle flex items-start gap-3 rounded-lg border px-3 py-2',
        className,
      )}
      data-ui="list-card"
      data-tone={tone}
    >
      <div className="min-w-0 flex-1" data-ui="list-card-body">
        <div
          className={cn('editor-text-strong truncate text-[16px] font-medium leading-5', titleClassName)}
          style={titleStyle}
          data-ui="list-card-title"
        >
          {title}
        </div>
        {description ? (
          <div
            className={cn('editor-text-muted mt-1 truncate text-[14px] leading-5', descriptionClassName)}
            style={descriptionStyle}
            data-ui="list-card-description"
          >
            {description}
          </div>
        ) : null}
      </div>
      {meta ? (
        <div
          className={cn('editor-text-muted shrink-0 pt-0.5 text-right text-[11px] leading-5', metaClassName)}
          data-ui="list-card-meta"
        >
          {meta}
        </div>
      ) : null}
      {actions ? (
        <div className="flex shrink-0 items-start gap-2" data-ui="list-card-actions">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
