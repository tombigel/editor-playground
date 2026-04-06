import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export function Pager({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  className,
  indicatorClassName,
  previousLabel = 'Prev',
  nextLabel = 'Next',
  hideWhenSinglePage = true,
}: {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
  indicatorClassName?: string;
  previousLabel?: string;
  nextLabel?: string;
  hideWhenSinglePage?: boolean;
}) {
  if (hideWhenSinglePage && totalPages <= 1) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1', className)} data-ui="pager">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-2"
        onClick={onPrevious}
        disabled={currentPage <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
        {previousLabel}
      </Button>
      <div
        className={cn('editor-text-muted min-w-[72px] text-center text-[11px]', indicatorClassName)}
        data-ui="pager-indicator"
      >
        Page {currentPage} / {totalPages}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-2"
        onClick={onNext}
        disabled={currentPage >= totalPages}
      >
        {nextLabel}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
