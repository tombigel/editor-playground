import { Button } from '@/components/ui/button';
import {
  ActionRow,
  NumericRow,
  SectionHeading,
} from '@/components/ui/settings-panel';

type AdvancedSettingsSectionProps = {
  undoDepth: number;
  redoDepth: number;
  historyLimit: number;
  onClearHistory: () => void;
  onHistoryLimitChange: (value: number) => void;
  onResetData: () => void;
  onResetAll: () => void;
};

export function AdvancedSettingsSection({
  undoDepth,
  redoDepth,
  historyLimit,
  onClearHistory,
  onHistoryLimitChange,
  onResetData,
  onResetAll,
}: AdvancedSettingsSectionProps) {
  return (
    <>
      <SectionHeading
        eyebrow="Advanced"
        title="Editing behavior"
        description="History and reset tools."
      />
      <NumericRow
        title="Undo retention"
        description={`Current stack: ${undoDepth} undo / ${redoDepth} redo`}
        value={historyLimit}
        onChange={onHistoryLimitChange}
      />
      <ActionRow
        title="Clear undo history"
        description="Clears undo and redo without changing the document."
        actions={
          <div className="flex w-full justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-[120px]"
              onClick={onClearHistory}
            >
              Clear
            </Button>
          </div>
        }
        actionsClassName="sm:min-w-[248px]"
      />
      <ActionRow
        title="Reset stage"
        description="Reset document data, or reset document data plus editor preferences."
        actions={
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onResetData}
            >
              Reset data
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={onResetAll}
            >
              Reset all
            </Button>
          </div>
        }
        actionsClassName="sm:min-w-[248px]"
      />
    </>
  );
}
