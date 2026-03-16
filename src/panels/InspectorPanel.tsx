import type { DocumentNode, EditorTextField, WrapperStyleField } from '../api/documentApi';
import type { InspectorActionHandlers, InspectorOrderState } from './inspector/types';
import { resolveInspectorBlocks } from './inspector/schema';

export {
  buildSizeFieldValue,
  convertRenderedPxToFontSizeValue,
  convertRenderedPxToUnitValue,
  convertStageFontSizeToInput,
  convertStageMeasurementToInput,
  describeSizeFieldValue,
  NumericUnitInlineField,
  normalizeAspectRatioExpression,
} from './InspectorControls';

type Props = {
  node: DocumentNode | null;
  showOrderControls: boolean;
  canOrderBack: boolean;
  canOrderForward: boolean;
  canSendToBack: boolean;
  canBringToFront: boolean;
  orderBackShortcut: string;
  orderForwardShortcut: string;
  sendToBackShortcut: string;
  bringToFrontShortcut: string;
  canSectionBack: boolean;
  canSectionForward: boolean;
  onOrderBack: () => void;
  onOrderForward: () => void;
  onSendToBack: () => void;
  onBringToFront: () => void;
  onSectionBack: () => void;
  onSectionForward: () => void;
  onTextChange: (field: EditorTextField, value: string) => void;
  onWrapperStyleChange: (field: WrapperStyleField, value: string) => void;
  onRectChange: (field: 'x' | 'y' | 'width' | 'height', value: string) => void;
  onPromote: (role: 'header' | 'footer') => void;
  onDemote: () => void;
  onStickyEnabled: (enabled: boolean) => void;
  onStickyTarget: (target: 'self' | 'contentWrapper') => void;
  onStickyEdges: (edge: 'top' | 'bottom' | 'both') => void;
  onStickyOffset: (value: number) => void;
  onStickyOffsetTop: (value: number) => void;
  onStickyOffsetBottom: (value: number) => void;
  onStickyDurationMode: (value: 'auto' | 'custom') => void;
  onStickyDuration: (value: number) => void;
  onStickyDurationTop: (value: number) => void;
  onStickyDurationBottom: (value: number) => void;
};

export function InspectorPanel({
  node,
  showOrderControls,
  canOrderBack,
  canOrderForward,
  canSendToBack,
  canBringToFront,
  orderBackShortcut,
  orderForwardShortcut,
  sendToBackShortcut,
  bringToFrontShortcut,
  canSectionBack,
  canSectionForward,
  onOrderBack,
  onOrderForward,
  onSendToBack,
  onBringToFront,
  onSectionBack,
  onSectionForward,
  onTextChange,
  onWrapperStyleChange,
  onRectChange,
  onPromote,
  onDemote,
  onStickyEnabled,
  onStickyTarget,
  onStickyEdges,
  onStickyOffset,
  onStickyOffsetTop,
  onStickyOffsetBottom,
  onStickyDurationMode,
  onStickyDuration,
  onStickyDurationTop,
  onStickyDurationBottom,
}: Props) {
  const actions: InspectorActionHandlers = {
    onTextChange,
    onWrapperStyleChange,
    onRectChange,
    onPromote,
    onDemote,
    onStickyEnabled,
    onStickyTarget,
    onStickyEdges,
    onStickyOffset,
    onStickyOffsetTop,
    onStickyOffsetBottom,
    onStickyDurationMode,
    onStickyDuration,
    onStickyDurationTop,
    onStickyDurationBottom,
  };
  const orderState: InspectorOrderState = {
    showOrderControls,
    canOrderBack,
    canOrderForward,
    canSendToBack,
    canBringToFront,
    orderBackShortcut,
    orderForwardShortcut,
    sendToBackShortcut,
    bringToFrontShortcut,
    canSectionBack,
    canSectionForward,
    onOrderBack,
    onOrderForward,
    onSendToBack,
    onBringToFront,
    onSectionBack,
    onSectionForward,
  };
  const blocks = resolveInspectorBlocks({ node, actions, orderState });

  return (
    <div className="flex h-full flex-col gap-1.5 overflow-auto p-2.5 text-xs">
      {blocks.map((block) => (
        <div
          key={block.id}
          data-inspector-block={block.id}
          data-inspector-bucket={block.bucket}
          data-inspector-align={block.align}
          data-inspector-layout={block.layout}
          className={block.align === 'start' ? 'self-start' : undefined}
        >
          {block.render ? (
            block.render()
          ) : (
            <div className="flex flex-col gap-1.5">
              {block.title || block.description ? (
                <div className="px-1 pb-0.5">
                  {block.title ? (
                    <div className="editor-text-strong text-[11px] font-semibold uppercase tracking-[0.08em]">
                      {block.title}
                    </div>
                  ) : null}
                  {block.description ? (
                    <div className="editor-text-muted mt-0.5 text-[11px]">{block.description}</div>
                  ) : null}
                </div>
              ) : null}
              <div className={block.layout === 'grid-2' ? 'grid grid-cols-2 gap-1.5' : 'flex flex-col gap-1.5'}>
                {block.sections.map((section) => (
                  <div key={section.id} data-inspector-section={section.id}>
                    {section.render()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
