import { ArrowBigDown, ArrowBigDownDash, ArrowBigUp, ArrowBigUpDash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InspectorActionHandlers, InspectorNode, InspectorOrderState, WrapperInspectorNode } from './types';
import { OrderIconButton, SizeInlineField, WrapperActions } from '../InspectorControls';

export function InspectorSummary({ node }: { node: InspectorNode | null }) {
  if (!node) {
    return (
      <div className="flex h-full flex-col gap-1.5 p-2.5 text-xs">
        <div className="space-y-1.5 pb-1.5">
          <div className="editor-text-muted text-[11px] font-semibold uppercase tracking-[0.12em]">Inspector</div>
          <div className="editor-text-muted mt-1 text-xs">Select a node to inspect its layout and sticky config.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 pb-1.5">
      <div className="editor-text-muted text-[11px] font-semibold uppercase tracking-[0.12em]">Inspector</div>
      <div className="mt-1 flex items-center gap-2">
        <h2 className="editor-text-strong text-[15px] font-semibold">{node.name}</h2>
        {node.type !== 'site' ? (
          <span className="editor-pill-subtle rounded-md px-2 py-0.5 text-[10px] font-medium">{node.role}</span>
        ) : null}
      </div>
    </div>
  );
}

export function NodeBasicsSection({
  node,
  orderState,
  actions,
}: {
  node: InspectorNode;
  orderState: InspectorOrderState;
  actions: Pick<InspectorActionHandlers, 'onTextChange' | 'onRectChange' | 'onPromote' | 'onDemote'>;
}) {
  return (
    <Card className="editor-border-subtle rounded-lg shadow-none">
      <CardContent className="space-y-2.5 px-3 py-3">
        <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1.5">
          <Label className="text-[11px] font-medium">Name</Label>
          <Input
            value={node.name}
            onChange={(e) => actions.onTextChange('name', e.target.value)}
            className="h-8 rounded-sm text-[11px]"
          />
        </div>

        {node.type !== 'site' ? (
          <div className="grid grid-cols-2 gap-1.5">
            <SizeInlineField
              label="X"
              nodeId={node.id}
              value={node.rect.x.base.raw}
              onChange={(value) => actions.onRectChange('x', value)}
              axis="x"
            />
            <SizeInlineField
              label="Y"
              nodeId={node.id}
              value={node.rect.y.base.raw}
              onChange={(value) => actions.onRectChange('y', value)}
              axis="y"
            />
            <SizeInlineField
              label="W"
              nodeId={node.id}
              value={node.rect.width.base.raw}
              onChange={(value) => actions.onRectChange('width', value)}
              axis="width"
            />
            <SizeInlineField
              label="H"
              nodeId={node.id}
              value={node.rect.height.base.raw}
              onChange={(value) => actions.onRectChange('height', value)}
              axis="height"
            />
          </div>
        ) : null}

        {orderState.showOrderControls ? (
          <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1.5">
            <Label className="text-[11px] font-medium">Order</Label>
            <div className="flex justify-end gap-1.5">
              <OrderIconButton
                label="Position Forward"
                shortcut={orderState.orderForwardShortcut}
                onClick={orderState.onOrderForward}
                disabled={!orderState.canOrderForward}
              >
                <ArrowBigUp className="h-4 w-4" />
              </OrderIconButton>
              <OrderIconButton
                label="Bring to Front"
                shortcut={orderState.bringToFrontShortcut}
                onClick={orderState.onBringToFront}
                disabled={!orderState.canBringToFront}
              >
                <ArrowBigUpDash className="h-4 w-4" />
              </OrderIconButton>
              <OrderIconButton
                label="Position Backward"
                shortcut={orderState.orderBackShortcut}
                onClick={orderState.onOrderBack}
                disabled={!orderState.canOrderBack}
              >
                <ArrowBigDown className="h-4 w-4" />
              </OrderIconButton>
              <OrderIconButton
                label="Send to Back"
                shortcut={orderState.sendToBackShortcut}
                onClick={orderState.onSendToBack}
                disabled={!orderState.canSendToBack}
              >
                <ArrowBigDownDash className="h-4 w-4" />
              </OrderIconButton>
            </div>
          </div>
        ) : null}

        {node.type === 'wrapper' ? (
          <WrapperActions
            node={node}
            canSectionBack={orderState.canSectionBack}
            canSectionForward={orderState.canSectionForward}
            onSectionBack={orderState.onSectionBack}
            onSectionForward={orderState.onSectionForward}
            onPromote={actions.onPromote}
            onDemote={actions.onDemote}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

export function WrapperDesignSection({
  node,
  onWrapperStyleChange,
}: {
  node: WrapperInspectorNode;
  onWrapperStyleChange: (field: 'background', value: string) => void;
}) {
  return (
    <Card className="editor-border-subtle rounded-lg shadow-none">
      <CardHeader className="px-3 pt-3 pb-1">
        <CardTitle className="text-xs">Design</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pt-1.5 pb-3">
        <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
          <Label className="text-[11px] font-medium">Background</Label>
          <div className="ml-auto flex items-center gap-2">
            <Input
              value={normalizeColorInputValue(node.style.background)}
              onChange={(e) => onWrapperStyleChange('background', e.target.value)}
              className="h-8 w-22 rounded-sm font-mono text-[11px] uppercase"
            />
            <input
              type="color"
              aria-label="Background color"
              className="editor-icon-button-subtle h-8 w-8 cursor-pointer rounded-sm border p-0 shadow-sm focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:outline-none"
              value={normalizeColorInputValue(node.style.background)}
              onChange={(e) => onWrapperStyleChange('background', e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function normalizeColorInputValue(value: string | undefined) {
  if (value && /^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }
  return '#ffffff';
}
