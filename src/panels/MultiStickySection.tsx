import type { ReactNode } from 'react';
import type { DocumentNode, FocusedMode } from '../api/editorApi';
import { isContainerNode } from '../model/types';
import { Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FormField, RangeField, StickyOffsetBandField, SwitchBlock } from './InspectorControls';
import { createFocusedModeEntry, InspectorSectionCard, type InspectorSectionHeaderAction } from './inspector/CommonSections';
import type { InspectorActionHandlers } from './inspector/types';
import { resolveSharedBoolean, resolveSharedNumber, resolveSharedString } from './inspector/multiSelectHelpers';

const MIXED_SELECT_VALUE = '__mixed__';

type Props = {
  selectedNodes: DocumentNode[];
  actions: Pick<
    InspectorActionHandlers,
    | 'onStickyEnabled'
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
};

export function MultiStickySection({
  selectedNodes,
  actions,
  focusedMode,
  globalStickyElevation,
  headerContent,
  headerAction,
  contentClassName,
}: Props) {
  const stickyNodes = selectedNodes.filter((node): node is Exclude<DocumentNode, { contentType: 'site' }> => node.contentType !== 'site');
  if (stickyNodes.length < 2) {
    return null;
  }

  const stickyEnabledState = resolveSharedBoolean(stickyNodes.map((node) => Boolean(node.sticky?.enabled)));
  const stickyEdgesState = resolveSharedString(stickyNodes.map(readStickyEdgeValue));
  const stickyOffsetState = resolveSharedNumber(stickyNodes.map(readStickyOffsetValue));
  const stickyOffsetTopState = resolveSharedNumber(stickyNodes.map(readStickyOffsetTopValue));
  const stickyOffsetBottomState = resolveSharedNumber(stickyNodes.map(readStickyOffsetBottomValue));
  const stickyDurationModeState = resolveSharedString(stickyNodes.map((node) => node.sticky?.durationMode ?? 'auto'));
  const stickyDurationState = resolveSharedNumber(stickyNodes.map(readStickyDurationValue));
  const stickyDurationTopState = resolveSharedNumber(stickyNodes.map(readStickyDurationTopValue));
  const stickyDurationBottomState = resolveSharedNumber(stickyNodes.map(readStickyDurationBottomValue));
  const stickyElevatedState = resolveSharedBoolean(stickyNodes.map((node) => Boolean(node.sticky?.elevated)));
  const forceAutoDuration = stickyNodes.every(isAutoDurationLocked);
  const showOffsetBand = stickyEdgesState.mixed || stickyEdgesState.value === 'both';
  const showCustomDuration = !forceAutoDuration && (stickyDurationModeState.mixed || stickyDurationModeState.value === 'custom');
  const statusLabel = stickyEnabledState.mixed ? 'Varies' : stickyEnabledState.value ? 'Enabled' : 'Disabled';

  return (
    <InspectorSectionCard
      title="Sticky"
      headerContent={headerContent}
      headerAction={headerAction}
      contentClassName={contentClassName}
      focusedModeEntry={createFocusedModeEntry(focusedMode, 'sticky', actions.onEnterFocusedMode)}
    >
      <div className="editor-bg-subtle editor-border-subtle flex items-center justify-between gap-3 rounded-md border px-2.5 py-2">
        <div className="flex items-center gap-2">
          {stickyEnabledState.mixed
            ? <Pin className="h-3.5 w-3.5 shrink-0 editor-text-muted" />
            : stickyEnabledState.value
              ? <Pin className="h-3.5 w-3.5 shrink-0 editor-text-accent" />
              : <PinOff className="h-3.5 w-3.5 shrink-0 editor-text-muted" />}
          <div>
            <div className="editor-text-strong text-xs font-medium">{statusLabel}</div>
            <div className="editor-text-muted text-[11px]">Pin selected nodes inside their structural range.</div>
          </div>
        </div>
        <div className="relative">
          <Switch
            checked={stickyEnabledState.mixed ? false : stickyEnabledState.value}
            onCheckedChange={actions.onStickyEnabled}
            className={stickyEnabledState.mixed ? 'bg-slate-400 data-[state=unchecked]:bg-slate-400' : undefined}
          />
          {stickyEnabledState.mixed ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="h-0.5 w-3 rounded-full bg-white" />
            </div>
          ) : null}
        </div>
      </div>

      {stickyEnabledState.value || stickyEnabledState.mixed ? (
        <>
          <FormField label="Edge">
            <Select
              value={stickyEdgesState.mixed ? MIXED_SELECT_VALUE : stickyEdgesState.value}
              onValueChange={(value) => {
                if (value !== MIXED_SELECT_VALUE) {
                  actions.onStickyEdges(value as 'top' | 'bottom' | 'both');
                }
              }}
            >
              <SelectTrigger className={stickyEdgesState.mixed ? 'border-dashed' : undefined}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MIXED_SELECT_VALUE}>-</SelectItem>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          {showOffsetBand ? (
            <StickyOffsetBandField
              topOffset={stickyOffsetTopState.value}
              bottomOffset={stickyOffsetBottomState.value}
              min={0}
              max={100}
              step={1}
              unit="vh"
              mixed={stickyOffsetTopState.mixed || stickyOffsetBottomState.mixed || stickyEdgesState.mixed}
              onValueChange={(top, bottom) => {
                actions.onStickyOffsetTop(top);
                actions.onStickyOffsetBottom(bottom);
              }}
            />
          ) : (
            <RangeField
              label="Offset"
              value={stickyOffsetState.value}
              min={0}
              max={100}
              step={1}
              unit="vh"
              mixed={stickyOffsetState.mixed}
              onValueChange={actions.onStickyOffset}
            />
          )}

          <div className="space-y-1.5">
            <FormField label="Duration" layout="inline" controlClassName="shrink-0">
              {forceAutoDuration ? (
                <div className="editor-bg-subtle editor-border-subtle inline-flex rounded-lg border p-0.5">
                  <Button type="button" variant="default" size="sm" className="h-7 px-2.5 text-[11px]" disabled>
                    Auto
                  </Button>
                </div>
              ) : (
                <div className="editor-bg-subtle editor-border-subtle inline-flex rounded-lg border p-0.5">
                  <Button
                    type="button"
                    variant={stickyDurationModeState.value === 'auto' && !stickyDurationModeState.mixed ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-7 px-2.5 text-[11px] ${stickyDurationModeState.mixed ? 'border border-dashed' : ''}`}
                    onClick={() => actions.onStickyDurationMode('auto')}
                  >
                    Auto
                  </Button>
                  <Button
                    type="button"
                    variant={stickyDurationModeState.value === 'custom' && !stickyDurationModeState.mixed ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-7 px-2.5 text-[11px] ${stickyDurationModeState.mixed ? 'border border-dashed' : ''}`}
                    onClick={() => actions.onStickyDurationMode('custom')}
                  >
                    Custom
                  </Button>
                </div>
              )}
            </FormField>
            {showCustomDuration ? (
              showOffsetBand ? (
                <div className="space-y-1.5">
                  <RangeField
                    label="Top Distance"
                    value={stickyDurationTopState.value}
                    min={0}
                    max={400}
                    step={25}
                    unit="vh"
                    mixed={stickyDurationTopState.mixed || stickyDurationModeState.mixed}
                    onValueChange={actions.onStickyDurationTop}
                  />
                  <RangeField
                    label="Bottom Distance"
                    value={stickyDurationBottomState.value}
                    min={0}
                    max={400}
                    step={25}
                    unit="vh"
                    mixed={stickyDurationBottomState.mixed || stickyDurationModeState.mixed}
                    onValueChange={actions.onStickyDurationBottom}
                  />
                </div>
              ) : (
                <RangeField
                  label={null}
                  value={stickyDurationState.value}
                  min={0}
                  max={400}
                  step={25}
                  unit="vh"
                  mixed={stickyDurationState.mixed || stickyDurationModeState.mixed}
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

          <SwitchBlock
            title="Global elevation"
            description="Elevate all sticky elements above siblings."
            checked={globalStickyElevation}
            onCheckedChange={actions.onStickyElevation}
          >
            {!globalStickyElevation ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="editor-text-strong text-xs font-medium">Elevate selected</div>
                  <div className="editor-text-muted text-[11px]">Override elevation for these stickies.</div>
                </div>
                <div className="relative">
                  <Switch
                    checked={stickyElevatedState.mixed ? false : stickyElevatedState.value}
                    onCheckedChange={actions.onStickyElevated}
                    className={stickyElevatedState.mixed ? 'bg-slate-400 data-[state=unchecked]:bg-slate-400' : undefined}
                  />
                  {stickyElevatedState.mixed ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="h-0.5 w-3 rounded-full bg-white" />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </SwitchBlock>
        </>
      ) : null}
    </InspectorSectionCard>
  );
}

function isAutoDurationLocked(node: Exclude<DocumentNode, { contentType: 'site' }>) {
  return isContainerNode(node) && node.subtype !== 'container' && (node.sticky?.target ?? 'self') === 'self';
}

function readStickyEdgeValue(node: Exclude<DocumentNode, { type: 'site' }>) {
  const top = node.sticky?.edges.top ?? !node.sticky?.edges.bottom;
  const bottom = node.sticky?.edges.bottom ?? false;
  if (top && bottom) {
    return 'both';
  }
  if (bottom) {
    return 'bottom';
  }
  return 'top';
}

function readStickyOffsetValue(node: Exclude<DocumentNode, { type: 'site' }>) {
  const offset = node.sticky?.offsetTop?.parsed ?? node.sticky?.offsetBottom?.parsed;
  return offset?.unit === 'vh' ? offset.value : 0;
}

function readStickyOffsetTopValue(node: Exclude<DocumentNode, { type: 'site' }>) {
  const offset = node.sticky?.offsetTop?.parsed;
  return offset?.unit === 'vh' ? offset.value : 0;
}

function readStickyOffsetBottomValue(node: Exclude<DocumentNode, { type: 'site' }>) {
  const offset = node.sticky?.offsetBottom?.parsed;
  return offset?.unit === 'vh' ? offset.value : 0;
}

function readStickyDurationValue(node: Exclude<DocumentNode, { type: 'site' }>) {
  if ((node.sticky?.durationMode ?? 'auto') === 'auto') {
    return 0;
  }
  const duration = node.sticky?.durationTop?.parsed ?? node.sticky?.duration.parsed;
  return duration?.unit === 'vh' ? duration.value : 50;
}

function readStickyDurationTopValue(node: Exclude<DocumentNode, { type: 'site' }>) {
  if ((node.sticky?.durationMode ?? 'auto') === 'auto') {
    return 0;
  }
  const duration = node.sticky?.durationTop?.parsed ?? node.sticky?.duration.parsed;
  return duration?.unit === 'vh' ? duration.value : 50;
}

function readStickyDurationBottomValue(node: Exclude<DocumentNode, { type: 'site' }>) {
  if ((node.sticky?.durationMode ?? 'auto') === 'auto') {
    return 0;
  }
  const duration = node.sticky?.durationBottom?.parsed ?? node.sticky?.duration.parsed;
  return duration?.unit === 'vh' ? duration.value : 50;
}
