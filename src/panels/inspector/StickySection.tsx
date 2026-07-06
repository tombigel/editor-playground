import type { ReactNode } from 'react';
import { isContainerNode } from '../../api/documentViewApi';
import type { FocusedMode } from '../../api/editorApi';
import type { ContainerSubtype } from '../../api/documentApi';
import { Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NoticeSurface } from '@/components/ui/settings-panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FormField, RangeField, StickyOffsetBandField, SwitchBlock } from '../InspectorControls';
import { createFocusedModeEntry, InspectorSectionCard, type InspectorSectionHeaderAction } from './CommonSections';
import type { InspectorActionHandlers, NonSiteInspectorNode } from './types';

export function StickySection({
  node,
  actions,
  focusedMode,
  globalStickyElevation,
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
    | 'onStickyElevation'
    | 'onStickyElevated'
    | 'onEnterFocusedMode'
  >;
  focusedMode: FocusedMode;
  globalStickyElevation: boolean;
  headerContent?: ReactNode;
  headerAction?: InspectorSectionHeaderAction;
  contentClassName?: string;
}) {
  const forceAutoDuration =
    isContainerNode(node) &&
    !isSemanticContainerSubtype(node.subtype) &&
    (node.sticky?.target ?? 'self') === 'self';
  return (
    <InspectorSectionCard
      title="Sticky"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
      focusedModeEntry={createFocusedModeEntry(focusedMode, 'sticky', actions.onEnterFocusedMode)}
    >
      <SwitchBlock
        icon={node.sticky?.enabled
          ? <Pin className="h-3.5 w-3.5 shrink-0 editor-text-accent" />
          : <PinOff className="h-3.5 w-3.5 shrink-0 editor-text-muted" />}
        title={node.sticky?.enabled ? 'Enabled' : 'Disabled'}
        description="Pin this node inside its structural range."
        checked={Boolean(node.sticky?.enabled)}
        onCheckedChange={actions.onStickyEnabled}
      />

        {node.sticky?.enabled ? (
          <>
            <FormField label="Edge" layout="inline">
              <Select size="compact" value={edgeValue(node)} onValueChange={(value) => actions.onStickyEdges(value as 'top' | 'bottom' | 'both')}>
                <SelectTrigger size="compact">
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
              <FormField label="Duration" layout="inline" controlClassName="shrink-0">
                {forceAutoDuration ? (
                  <div className="editor-bg-subtle editor-border-subtle inline-flex rounded-lg border p-0.5">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="h-6 px-2.5 text-[11px]"
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
                      className="h-6 px-2.5 text-[11px]"
                      onClick={() => actions.onStickyDurationMode('auto')}
                    >
                      Auto
                    </Button>
                    <Button
                      type="button"
                      variant={(node.sticky?.durationMode ?? 'auto') === 'custom' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-6 px-2.5 text-[11px]"
                      onClick={() => actions.onStickyDurationMode('custom')}
                    >
                      Custom
                    </Button>
                  </div>
                )}
              </FormField>
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
                <NoticeSurface tone="info" className="px-2.5 py-1.5 text-[11px] leading-4">
                  {forceAutoDuration
                    ? 'Uses the page height as the sticky distance.'
                    : 'Uses the owner section height as the sticky distance.'}
                </NoticeSurface>
              )}
            </div>

            <SwitchBlock
              title="Global elevation"
              description="Elevate all sticky elements above siblings."
              checked={globalStickyElevation}
              onCheckedChange={actions.onStickyElevation}
            >
              {!globalStickyElevation ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="editor-text-strong text-xs font-medium">Elevate this node</div>
                    <div className="editor-text-muted text-[11px]">Pin above siblings for this sticky only.</div>
                  </div>
                  <Switch checked={Boolean(node.sticky?.elevated)} onCheckedChange={actions.onStickyElevated} />
                </div>
              ) : null}
            </SwitchBlock>
          </>
        ) : null}
    </InspectorSectionCard>
  );
}

function isSemanticContainerSubtype(subtype: ContainerSubtype) {
  return subtype === 'container' || subtype === 'nav' || subtype === 'aside' || subtype === 'article';
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
