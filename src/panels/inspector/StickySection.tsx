import type { ReactNode } from 'react';
import type { FocusedMode } from '../../api/editorApi';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FormField, RangeField, StickyOffsetBandField } from '../InspectorControls';
import { createFocusedModeEntry, InspectorSectionCard, type InspectorSectionHeaderAction } from './CommonSections';
import type { InspectorActionHandlers, NonSiteInspectorNode } from './types';

export function StickySection({
  node,
  actions,
  focusedMode,
  headerContent,
  headerAction,
  contentClassName,
}: {
  node: NonSiteInspectorNode;
  actions: Pick<
    InspectorActionHandlers,
    | 'onStickyEnabled'
    | 'onStickyTarget'
    | 'onStickyEdges'
    | 'onStickyOffset'
    | 'onStickyOffsetTop'
    | 'onStickyOffsetBottom'
    | 'onStickyDurationMode'
    | 'onStickyDuration'
    | 'onStickyDurationTop'
    | 'onStickyDurationBottom'
    | 'onEnterFocusedMode'
  >;
  focusedMode: FocusedMode;
  headerContent?: ReactNode;
  headerAction?: InspectorSectionHeaderAction;
  contentClassName?: string;
}) {
  const forceAutoDuration =
    node.type === 'wrapper' &&
    node.role !== 'container' &&
    (node.sticky?.target ?? 'self') === 'self';
  return (
    <InspectorSectionCard
      title="Sticky"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
      focusedModeEntry={createFocusedModeEntry(focusedMode, 'sticky', actions.onEnterFocusedMode)}
    >
      <div className="editor-bg-subtle editor-border-subtle flex items-center justify-between gap-3 rounded-md border px-2.5 py-2">
          <div>
            <div className="editor-text-strong text-xs font-medium">{node.sticky?.enabled ? 'Enabled' : 'Disabled'}</div>
            <div className="editor-text-muted text-[11px]">Pin this node inside its structural range.</div>
          </div>
          <Switch checked={Boolean(node.sticky?.enabled)} onCheckedChange={actions.onStickyEnabled} />
      </div>

        {node.sticky?.enabled ? (
          <>
            <FormField label="Edge">
              <Select value={edgeValue(node)} onValueChange={(value) => actions.onStickyEdges(value as 'top' | 'bottom' | 'both')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {edgeValue(node) === 'both' ? (
              <StickyOffsetBandField
                topOffset={stickyOffsetTopVh(node)}
                bottomOffset={stickyOffsetBottomVh(node)}
                min={0}
                max={100}
                step={1}
                unit="vh"
                onValueChange={(top, bottom) => {
                  actions.onStickyOffsetTop(top);
                  actions.onStickyOffsetBottom(bottom);
                }}
              />
            ) : (
              <RangeField
                label="Offset"
                value={stickyOffsetVh(node)}
                min={0}
                max={100}
                step={1}
                unit="vh"
                onValueChange={actions.onStickyOffset}
              />
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-[11px] font-medium">Duration</Label>
                {forceAutoDuration ? (
                  <div className="editor-bg-subtle editor-border-subtle inline-flex rounded-lg border p-0.5">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="h-7 px-2.5 text-[11px]"
                      disabled
                    >
                      Auto
                    </Button>
                  </div>
                ) : (
                  <div className="editor-bg-subtle editor-border-subtle inline-flex rounded-lg border p-0.5">
                    <Button
                      type="button"
                      variant={(node.sticky?.durationMode ?? 'auto') === 'auto' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-7 px-2.5 text-[11px]"
                      onClick={() => actions.onStickyDurationMode('auto')}
                    >
                      Auto
                    </Button>
                    <Button
                      type="button"
                      variant={(node.sticky?.durationMode ?? 'auto') === 'custom' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-7 px-2.5 text-[11px]"
                      onClick={() => actions.onStickyDurationMode('custom')}
                    >
                      Custom
                    </Button>
                  </div>
                )}
              </div>
              {!forceAutoDuration && (node.sticky?.durationMode ?? 'auto') === 'custom' ? (
                edgeValue(node) === 'both' ? (
                  <div className="space-y-1.5">
                    <RangeField
                      label="Top Distance"
                      value={stickyDurationTopVh(node)}
                      min={0}
                      max={400}
                      step={25}
                      unit="vh"
                      onValueChange={actions.onStickyDurationTop}
                    />
                    <RangeField
                      label="Bottom Distance"
                      value={stickyDurationBottomVh(node)}
                      min={0}
                      max={400}
                      step={25}
                      unit="vh"
                      onValueChange={actions.onStickyDurationBottom}
                    />
                  </div>
                ) : (
                  <RangeField
                    label={null}
                    value={stickyDurationVh(node)}
                    min={0}
                    max={400}
                    step={25}
                    unit="vh"
                    onValueChange={actions.onStickyDuration}
                  />
                )
              ) : (
                <div className="editor-bg-subtle editor-border-subtle editor-text-muted rounded-md border px-2.5 py-1.5 text-[11px]">
                  {forceAutoDuration
                    ? 'Uses the page height as the sticky distance.'
                    : 'Uses the owner section height as the sticky distance.'}
                </div>
              )}
            </div>
          </>
        ) : null}
    </InspectorSectionCard>
  );
}

function edgeValue(node: NonSiteInspectorNode) {
  const top = node.sticky?.edges.top;
  const bottom = node.sticky?.edges.bottom;
  if (top && bottom) {
    return 'both';
  }
  if (bottom) {
    return 'bottom';
  }
  return 'top';
}

function stickyDurationVh(node: NonSiteInspectorNode) {
  if ((node.sticky?.durationMode ?? 'auto') === 'auto') {
    return 0;
  }
  const duration = node.sticky?.durationTop?.parsed ?? node.sticky?.duration.parsed;
  if (!duration) {
    return 50;
  }
  return duration.unit === 'vh' ? duration.value : 50;
}

function stickyOffsetVh(node: NonSiteInspectorNode) {
  const offset = node.sticky?.offsetTop?.parsed ?? node.sticky?.offsetBottom?.parsed;
  if (!offset) {
    return 0;
  }
  return offset.unit === 'vh' ? offset.value : 0;
}

function stickyOffsetTopVh(node: NonSiteInspectorNode) {
  const offset = node.sticky?.offsetTop?.parsed;
  if (!offset) {
    return 0;
  }
  return offset.unit === 'vh' ? offset.value : 0;
}

function stickyOffsetBottomVh(node: NonSiteInspectorNode) {
  const offset = node.sticky?.offsetBottom?.parsed;
  if (!offset) {
    return 0;
  }
  return offset.unit === 'vh' ? offset.value : 0;
}

function stickyDurationTopVh(node: NonSiteInspectorNode) {
  if ((node.sticky?.durationMode ?? 'auto') === 'auto') {
    return 0;
  }
  const duration = node.sticky?.durationTop?.parsed ?? node.sticky?.duration.parsed;
  if (!duration) {
    return 50;
  }
  return duration.unit === 'vh' ? duration.value : 50;
}

function stickyDurationBottomVh(node: NonSiteInspectorNode) {
  if ((node.sticky?.durationMode ?? 'auto') === 'auto') {
    return 0;
  }
  const duration = node.sticky?.durationBottom?.parsed ?? node.sticky?.duration.parsed;
  if (!duration) {
    return 50;
  }
  return duration.unit === 'vh' ? duration.value : 50;
}
