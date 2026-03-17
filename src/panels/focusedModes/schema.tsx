import { SquareArrowRightEnter } from 'lucide-react';
import type { ReactNode } from 'react';
import type { FocusedMode } from '../../api/editorApi';
import { StickySection } from '../inspector/StickySection';
import type { InspectorSectionContext, ResolvedInspectorBlock } from '../inspector/types';

type FocusedModeOptions = {
  headerContent?: ReactNode;
  onExitFocusedMode?: () => void;
};

export function resolveFocusedModeBlocks(
  mode: FocusedMode,
  context: InspectorSectionContext,
  options: FocusedModeOptions = {},
): ResolvedInspectorBlock[] {
  if (!mode) {
    return [];
  }
  const stickyNode = context.node && context.node.type !== 'site' ? context.node : null;

  if (mode === 'sticky' && stickyNode) {
    return [
      {
        id: 'sticky-behavior',
        bucket: 'behavior',
        align: 'stretch',
        layout: 'custom',
        sections: [],
        render: () => (
          <StickySection
            node={stickyNode}
            actions={context.actions}
            focusedMode={context.focusedMode}
            headerContent={options.headerContent}
            contentClassName="space-y-3 px-3 pt-1.5 pb-5"
            headerAction={
              options.onExitFocusedMode
                ? {
                    ariaLabel: 'Close sticky mode',
                    icon: <SquareArrowRightEnter className="h-3.5 w-3.5" />,
                    onClick: options.onExitFocusedMode,
                  }
                : undefined
            }
          />
        ),
      },
    ];
  }

  return [
    {
      id: `${mode}-empty`,
      bucket: 'behavior',
      align: 'stretch',
      layout: 'custom',
      sections: [],
      render: () => (
        <div className="editor-bg-subtle editor-border-subtle rounded-lg border px-3 py-3">
          <div className="editor-text-strong text-sm font-medium">Nothing to edit yet</div>
          <div className="editor-text-muted mt-1 text-xs leading-5">
            Select a non-site node to edit its {mode} controls from focused mode.
          </div>
        </div>
      ),
    },
  ];
}
