import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowBigDown,
  ArrowBigDownDash,
  ArrowBigUp,
  ArrowBigUpDash,
  ArrowUp,
  BetweenHorizontalStart,
  ChevronDown,
  ListEnd,
  ListStart,
  PanelBottom,
  PanelTop,
  PilcrowLeft,
  PilcrowRight,
  Proportions,
} from 'lucide-react';
import type { DocumentNode, WrapperNode } from '../api/documentApi';
import { parseFontSizeValue, parseHeightValue, parseUnitValue, parseWidthValue } from '../api/documentApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PopoverTooltip } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type SizeFieldAxis = 'x' | 'y' | 'width' | 'height';
type SizeFieldMode = 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax' | 'fit-content' | 'min-content' | 'max-content' | 'auto' | 'aspect-ratio';
type FontSizeMode = 'px' | 'em' | 'rem';
type SizeFieldDescriptor =
  | { kind: 'numeric'; mode: Extract<SizeFieldMode, 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax'>; input: string }
  | { kind: 'keyword'; mode: Extract<SizeFieldMode, 'fit-content' | 'min-content' | 'max-content' | 'auto'>; input: '' }
  | { kind: 'aspect-ratio'; mode: 'aspect-ratio'; input: string };

const WIDTH_KEYWORD_OPTIONS: Extract<SizeFieldMode, 'fit-content' | 'min-content' | 'max-content'>[] = [
  'fit-content',
  'min-content',
  'max-content',
];
const HEIGHT_KEYWORD_OPTIONS: Extract<SizeFieldMode, 'auto' | 'aspect-ratio'>[] = ['auto', 'aspect-ratio'];
const FONT_SIZE_UNIT_OPTIONS: FontSizeMode[] = ['px', 'em', 'rem'];

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
  onTextChange: (field: string, value: string) => void;
  onWrapperStyleChange: (field: 'background', value: string) => void;
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
  if (!node) {
    return (
      <div className="flex h-full flex-col gap-1.5 p-2.5 text-xs">
        <div className="space-y-1.5 pb-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Inspector</div>
          <div className="mt-1 text-xs text-slate-600">Select a node to inspect its layout and sticky config.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-1.5 overflow-auto p-2.5 text-xs">
      <div className="space-y-1.5 pb-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Inspector</div>
        <div className="mt-1 flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-slate-950">{node.name}</h2>
          {node.type !== 'site' ? (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {node.role}
            </span>
          ) : null}
        </div>
      </div>

      <Card className="rounded-lg border-slate-200/90 shadow-none">
        <CardContent className="space-y-2.5 px-3 py-3">
          <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1.5">
            <Label className="text-[11px] font-medium text-slate-500">Name</Label>
            <Input value={node.name} onChange={(e) => onTextChange('name', e.target.value)} className="h-8 rounded-sm text-[11px]" />
          </div>

          {node.type !== 'site' ? (
            <div className="grid grid-cols-2 gap-1.5">
              <SizeInlineField
                label="X"
                nodeId={node.id}
                value={node.rect.x.base.raw}
                onChange={(value) => onRectChange('x', value)}
                axis="x"
              />
              <SizeInlineField
                label="Y"
                nodeId={node.id}
                value={node.rect.y.base.raw}
                onChange={(value) => onRectChange('y', value)}
                axis="y"
              />
              <SizeInlineField
                label="W"
                nodeId={node.id}
                value={node.rect.width.base.raw}
                onChange={(value) => onRectChange('width', value)}
                axis="width"
              />
              <SizeInlineField
                label="H"
                nodeId={node.id}
                value={node.rect.height.base.raw}
                onChange={(value) => onRectChange('height', value)}
                axis="height"
              />
            </div>
          ) : null}

          {showOrderControls ? (
            <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1.5">
              <Label className="text-[11px] font-medium text-slate-500">Order</Label>
              <div className="flex justify-end gap-1.5">
                <OrderIconButton
                  label="Position Forward"
                  shortcut={orderForwardShortcut}
                  onClick={onOrderForward}
                  disabled={!canOrderForward}
                >
                  <ArrowBigUp className="h-4 w-4" />
                </OrderIconButton>
                <OrderIconButton
                  label="Bring to Front"
                  shortcut={bringToFrontShortcut}
                  onClick={onBringToFront}
                  disabled={!canBringToFront}
                >
                  <ArrowBigUpDash className="h-4 w-4" />
                </OrderIconButton>
                <OrderIconButton
                  label="Position Backward"
                  shortcut={orderBackShortcut}
                  onClick={onOrderBack}
                  disabled={!canOrderBack}
                >
                  <ArrowBigDown className="h-4 w-4" />
                </OrderIconButton>
                <OrderIconButton
                  label="Send to Back"
                  shortcut={sendToBackShortcut}
                  onClick={onSendToBack}
                  disabled={!canSendToBack}
                >
                  <ArrowBigDownDash className="h-4 w-4" />
                </OrderIconButton>
              </div>
            </div>
          ) : null}

          {node.type === 'wrapper' ? (
            <WrapperActions
              node={node}
              canSectionBack={canSectionBack}
              canSectionForward={canSectionForward}
              onSectionBack={onSectionBack}
              onSectionForward={onSectionForward}
              onPromote={onPromote}
              onDemote={onDemote}
            />
          ) : null}
        </CardContent>
      </Card>

      {node.type !== 'site' ? (
        <>
          {node.type === 'wrapper' ? (
            <Card className="rounded-lg border-slate-200/90 shadow-none">
              <CardHeader className="px-3 pt-3 pb-1">
                <CardTitle className="text-xs">Design</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pt-1.5 pb-3">
                <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
                  <Label className="text-[11px] font-medium text-slate-500">Background</Label>
                  <div className="ml-auto flex items-center gap-2">
                    <Input
                      value={normalizeColorInputValue(node.style.background)}
                      onChange={(e) => onWrapperStyleChange('background', e.target.value)}
                      className="h-8 w-22 rounded-sm font-mono text-[11px] uppercase"
                    />
                    <input
                      type="color"
                      aria-label="Background color"
                      className="h-8 w-8 cursor-pointer rounded-sm border border-slate-200 bg-white p-0 shadow-sm transition-[background-color,border-color,box-shadow] duration-150 hover:border-slate-300 hover:bg-slate-50/80 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:outline-none"
                      value={normalizeColorInputValue(node.style.background)}
                      onChange={(e) => onWrapperStyleChange('background', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {node.type === 'leaf' && node.role === 'text' ? (
            <Card className="rounded-lg border-slate-200/90 shadow-none">
              <CardHeader className="px-3 pt-3 pb-1">
                <CardTitle className="text-xs">Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
                <FormField label="Text">
                  <Textarea value={node.content} onChange={(e) => onTextChange('content', e.target.value)} />
                </FormField>
                <div className="space-y-1.5">
                  <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
                    <Label className="text-[11px] font-medium text-slate-500">Size</Label>
                    <div className="ml-auto grid w-[140px] grid-cols-[96px_40px] items-center gap-1">
                      <FontSizeField
                        nodeId={node.id}
                        value={fontSizeFieldValue(node)}
                        onChange={(value) => onTextChange('fontSize', value)}
                      />
                      <NumberInput
                        value={lineHeightValue(node)}
                        min={0.1}
                        max={4}
                        step={0.1}
                        onChange={(value) => onTextChange('lineHeight', String(value))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
                    <Label className="text-[11px] font-medium text-slate-500">Style</Label>
                    <div className="ml-auto flex items-center gap-1">
                      <TextStyleIconButton
                        label="Bold"
                        active={node.style?.fontWeight === 'bold'}
                        onClick={() => onTextChange('fontWeight', node.style?.fontWeight === 'bold' ? 'normal' : 'bold')}
                      >
                        <span className="font-black tracking-[-0.02em]">B</span>
                      </TextStyleIconButton>
                      <TextStyleIconButton
                        label="Italic"
                        active={node.style?.fontStyle === 'italic'}
                        onClick={() =>
                          onTextChange('fontStyle', node.style?.fontStyle === 'italic' ? 'normal' : 'italic')
                        }
                      >
                        <span className="font-medium italic">I</span>
                      </TextStyleIconButton>
                      <TextStyleIconButton
                        label="Underline"
                        active={textDecorationHasUnderline(node)}
                        onClick={() =>
                          onTextChange(
                            'textDecorationLine',
                            toggleTextDecorationLine(node.style?.textDecorationLine, 'underline'),
                          )
                        }
                      >
                        <span className="underline">U</span>
                      </TextStyleIconButton>
                      <TextStyleIconButton
                        label="Strikethrough"
                        active={textDecorationHasLineThrough(node)}
                        onClick={() =>
                          onTextChange(
                            'textDecorationLine',
                            toggleTextDecorationLine(node.style?.textDecorationLine, 'line-through'),
                          )
                        }
                      >
                        <span className="line-through">S</span>
                      </TextStyleIconButton>
                    </div>
                  </div>
                  <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
                    <Label className="text-[11px] font-medium text-slate-500">Alignment</Label>
                    <div className="ml-auto flex items-center gap-1">
                      <TextStyleIconButton
                        label="Align left"
                        active={(node.style?.textAlign ?? 'left') === 'left'}
                        onClick={() => onTextChange('textAlign', 'left')}
                      >
                        <AlignLeft className="h-4 w-4" />
                      </TextStyleIconButton>
                      <TextStyleIconButton
                        label="Align center"
                        active={node.style?.textAlign === 'center'}
                        onClick={() => onTextChange('textAlign', 'center')}
                      >
                        <AlignCenter className="h-4 w-4" />
                      </TextStyleIconButton>
                      <TextStyleIconButton
                        label="Align right"
                        active={node.style?.textAlign === 'right'}
                        onClick={() => onTextChange('textAlign', 'right')}
                      >
                        <AlignRight className="h-4 w-4" />
                      </TextStyleIconButton>
                      <TextStyleIconButton
                        label="Text direction"
                        active={false}
                        onClick={() =>
                          onTextChange('direction', (node.style?.direction ?? 'ltr') === 'rtl' ? 'ltr' : 'rtl')
                        }
                      >
                        {(node.style?.direction ?? 'ltr') === 'rtl' ? (
                          <PilcrowLeft className="h-4 w-4" />
                        ) : (
                          <PilcrowRight className="h-4 w-4" />
                        )}
                      </TextStyleIconButton>
                    </div>
                  </div>
                  <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
                    <Label className="text-[11px] font-medium text-slate-500">HTML tag</Label>
                    <Select value={node.htmlTag} onValueChange={(value) => onTextChange('htmlTag', value)}>
                      <SelectTrigger className="ml-auto h-8 w-24 rounded-sm text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="h1">h1</SelectItem>
                        <SelectItem value="h2">h2</SelectItem>
                        <SelectItem value="h3">h3</SelectItem>
                        <SelectItem value="h4">h4</SelectItem>
                        <SelectItem value="h5">h5</SelectItem>
                        <SelectItem value="h6">h6</SelectItem>
                        <SelectItem value="p">p</SelectItem>
                        <SelectItem value="blockquote">blockquote</SelectItem>
                        <SelectItem value="div">div</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {node.type === 'leaf' && node.role === 'button' ? (
            <Card className="rounded-lg border-slate-200/90 shadow-none">
              <CardHeader className="px-3 pt-3 pb-1">
                <CardTitle className="text-xs">Content</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pt-1.5 pb-3">
                <FormField label="Label">
                  <Input value={node.label} onChange={(e) => onTextChange('label', e.target.value)} />
                </FormField>
              </CardContent>
            </Card>
          ) : null}

          {node.type === 'leaf' && node.role === 'link' ? (
            <Card className="rounded-lg border-slate-200/90 shadow-none">
              <CardHeader className="px-3 pt-3 pb-1">
                <CardTitle className="text-xs">Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
                <FormField label="Label">
                  <Input value={node.label} onChange={(e) => onTextChange('label', e.target.value)} />
                </FormField>
                <FormField label="Href">
                  <Input value={node.href ?? ''} onChange={(e) => onTextChange('href', e.target.value)} />
                </FormField>
              </CardContent>
            </Card>
          ) : null}

          {node.type === 'leaf' && node.role === 'image' ? (
            <Card className="rounded-lg border-slate-200/90 shadow-none">
              <CardHeader className="px-3 pt-3 pb-1">
                <CardTitle className="text-xs">Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
                <FormField label="Src">
                  <Input value={node.src ?? ''} onChange={(e) => onTextChange('src', e.target.value)} />
                </FormField>
                <FormField label="Alt">
                  <Input value={node.alt ?? ''} onChange={(e) => onTextChange('alt', e.target.value)} />
                </FormField>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-lg border-slate-200/90 shadow-none">
            <CardHeader className="px-3 pt-3 pb-1">
              <CardTitle className="text-xs">Sticky</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-3 pt-1.5 pb-3">
              <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-2">
                <div>
                  <div className="text-xs font-medium text-slate-900">
                    {node.sticky?.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                  <div className="text-[11px] text-slate-500">Pin this node inside its structural range.</div>
                </div>
                <Switch checked={Boolean(node.sticky?.enabled)} onCheckedChange={onStickyEnabled} />
              </div>

              {node.sticky?.enabled ? (
                <>
                  {(() => {
                    const stickyEdge = edgeValue(node);
                    return (
                      <>
                  {node.type === 'wrapper' ? (
                    node.role === 'container' ? (
                      <FormField label="Target">
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600">
                          Self (content wrapper target is temporarily hidden for containers)
                        </div>
                      </FormField>
                    ) : (
                      <FormField label="Target">
                        <Select
                          value={node.sticky?.target ?? 'self'}
                          onValueChange={(value) => onStickyTarget(value as 'self' | 'contentWrapper')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="self">Self</SelectItem>
                            <SelectItem value="contentWrapper">Content wrapper</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>
                    )
                  ) : null}

                  <FormField label="Edge">
                    <Select value={edgeValue(node)} onValueChange={(value) => onStickyEdges(value as 'top' | 'bottom' | 'both')}>
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

                  {stickyEdge === 'both' ? (
                    <StickyOffsetBandField
                      topOffset={stickyOffsetTopVh(node)}
                      bottomOffset={stickyOffsetBottomVh(node)}
                      min={0}
                      max={100}
                      step={1}
                      unit="vh"
                      onValueChange={(top, bottom) => {
                        onStickyOffsetTop(top);
                        onStickyOffsetBottom(bottom);
                      }}
                    />
                  ) : (
                    <RangeField label="Offset" value={stickyOffsetVh(node)} min={0} max={100} step={1} unit="vh" onValueChange={onStickyOffset} />
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-[11px] font-medium text-slate-500">
                        Duration
                      </Label>
                      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                        <Button
                          type="button"
                          variant={(node.sticky?.durationMode ?? 'auto') === 'auto' ? 'default' : 'ghost'}
                          size="sm"
                          className="h-7 px-2.5 text-[11px]"
                          onClick={() => onStickyDurationMode('auto')}
                        >
                          Auto
                        </Button>
                        <Button
                          type="button"
                          variant={(node.sticky?.durationMode ?? 'auto') === 'custom' ? 'default' : 'ghost'}
                          size="sm"
                          className="h-7 px-2.5 text-[11px]"
                          onClick={() => onStickyDurationMode('custom')}
                        >
                          Custom
                        </Button>
                      </div>
                    </div>
                    {(node.sticky?.durationMode ?? 'auto') === 'custom' ? (
                      stickyEdge === 'both' ? (
                        <div className="space-y-1.5">
                          <RangeField
                            label="Top Distance"
                            value={stickyDurationTopVh(node)}
                            min={0}
                            max={400}
                            step={25}
                            unit="vh"
                            onValueChange={onStickyDurationTop}
                          />
                          <RangeField
                            label="Bottom Distance"
                            value={stickyDurationBottomVh(node)}
                            min={0}
                            max={400}
                            step={25}
                            unit="vh"
                            onValueChange={onStickyDurationBottom}
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
                          onValueChange={onStickyDuration}
                        />
                      )
                    ) : (
                      <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600">
                        Uses the owner section height as the sticky distance.
                      </div>
                    )}
                  </div>
                      </>
                    );
                  })()}
                </>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function SizeInlineField({
  label,
  nodeId,
  axis,
  value,
  onChange,
}: {
  label: string;
  nodeId: string;
  axis: SizeFieldAxis;
  value: string;
  onChange: (value: string) => void;
}) {
  const [mode, setMode] = useState<SizeFieldMode>(() => describeSizeFieldValue(value, axis).mode);
  const [numericDraft, setNumericDraft] = useState(() => getInitialNumericDraft(value, axis));
  const [aspectDraft, setAspectDraft] = useState(() => getInitialAspectDraft(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const descriptor = describeSizeFieldValue(value, axis);
    setMode(descriptor.mode);
    if (descriptor.kind === 'numeric') {
      setNumericDraft(descriptor.input);
    }
    if (descriptor.kind === 'aspect-ratio') {
      setAspectDraft(descriptor.input);
    }
    setInvalid(false);
  }, [axis, value]);

  const descriptor = describeSizeFieldValue(value, axis);
  const showNumericInput = mode === 'px' || mode === '%' || mode === 'vw' || mode === 'vh' || mode === 'vmin' || mode === 'vmax';
  const showAspectInput = mode === 'aspect-ratio';
  const showKeywordTriggerOnly = !showNumericInput && !showAspectInput;
  const suffixWidthClass = showAspectInput ? 'w-[52px] min-w-[52px]' : 'w-[44px] min-w-[44px]';
  const usesIconSuffix = mode === 'aspect-ratio';
  const shellClass = invalid
    ? 'border-red-400 bg-red-50 focus-within:border-red-400'
    : 'border-slate-200 bg-white focus-within:border-blue-500';

  function commitDraft(nextMode: SizeFieldMode, nextInput?: string) {
    const candidateInput = nextInput ?? (nextMode === 'aspect-ratio' ? aspectDraft : numericDraft);
    const nextRaw = buildSizeFieldValue(axis, nextMode, candidateInput);
    if (!nextRaw) {
      setInvalid(true);
      return false;
    }
    setInvalid(false);
    onChange(nextRaw);
    return true;
  }

  function handleModeChange(nextMode: string) {
    const resolvedMode = nextMode as SizeFieldMode;
    setMode(resolvedMode);

    if (resolvedMode === 'aspect-ratio') {
      const nextAspect = descriptor.kind === 'aspect-ratio' ? descriptor.input : aspectDraft || '16/9';
      setAspectDraft(nextAspect);
      commitDraft(resolvedMode, nextAspect);
      return;
    }

    if (resolvedMode === 'auto' || resolvedMode === 'fit-content' || resolvedMode === 'min-content' || resolvedMode === 'max-content') {
      commitDraft(resolvedMode);
      return;
    }

    const convertedNumeric = convertStageMeasurementToInput(nodeId, axis, resolvedMode);
    const nextNumeric =
      convertedNumeric ?? (descriptor.kind === 'numeric' ? descriptor.input : numericDraft || getDefaultNumericDraft(axis));
    setNumericDraft(nextNumeric);
    commitDraft(resolvedMode, nextNumeric);
  }

  return (
    <div className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-1">
      <Label className="text-[11px] font-medium text-slate-500">{label}</Label>
      {showKeywordTriggerOnly ? (
        <div
          className={`group/sizefield relative flex h-8 overflow-visible rounded-sm border shadow-sm transition-[border-color,box-shadow] ${shellClass}`}
        >
          <Select value={mode} onValueChange={handleModeChange}>
            <SelectTrigger
              className="peer/keywordtrigger h-full w-full justify-start rounded-none border-0 bg-transparent px-2.5 pr-8 text-left text-[10px] tracking-[-0.01em] whitespace-nowrap shadow-none [&>svg]:hidden focus:border-0 focus:ring-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{renderSizeModeOptions(axis)}</SelectContent>
          </Select>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-9 items-center justify-center rounded-r-sm bg-white opacity-0 transition-opacity group-hover/sizefield:opacity-100 peer-focus-visible/keywordtrigger:opacity-100 peer-data-[state=open]/keywordtrigger:opacity-100">
            <ChevronDown className="h-3.5 w-3.5 text-slate-700" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-9 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/keywordtrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/keywordtrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]" />
        </div>
      ) : (
        <div
          className={`group/sizefield relative flex h-8 overflow-visible rounded-sm border shadow-sm transition-[border-color,box-shadow] ${shellClass}`}
        >
          {showNumericInput ? (
            <Input
              type="number"
              step="any"
              value={numericDraft}
              onChange={(e) => {
                const next = e.target.value;
                setNumericDraft(next);
                const nextRaw = buildSizeFieldValue(axis, mode, next);
                setInvalid(!nextRaw);
                if (nextRaw) {
                  onChange(nextRaw);
                }
              }}
              className="peer/valueinput h-full flex-1 overflow-visible rounded-none border-0 bg-transparent px-3 text-[11px] text-slate-600 shadow-none [appearance:textfield] focus-visible:border-0 focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          ) : (
            <Input
              value={aspectDraft}
              onChange={(e) => {
                const next = e.target.value;
                setAspectDraft(next);
                const nextRaw = buildSizeFieldValue(axis, 'aspect-ratio', next);
                setInvalid(!nextRaw);
                if (nextRaw) {
                  onChange(nextRaw);
                }
              }}
              className="peer/valueinput h-full flex-1 overflow-visible rounded-none border-0 bg-transparent px-3 text-[11px] text-slate-600 shadow-none focus-visible:border-0 focus-visible:ring-0"
            />
          )}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-20 rounded-l-sm shadow-none transition-[box-shadow] peer-focus-visible/valueinput:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]"
            style={{ right: usesIconSuffix ? '52px' : '44px' }}
          />
          <div className={`group/unitsuffix relative ${suffixWidthClass}`}>
            <Select value={mode} onValueChange={handleModeChange}>
              <SelectTrigger
                className={`peer/unittrigger relative z-10 h-full ${suffixWidthClass} justify-center rounded-none border-0 border-l border-slate-200 bg-transparent px-0 text-center text-[10px] font-medium text-slate-800 shadow-none [&>span]:w-full [&>span]:justify-center [&>svg]:hidden focus:border-0 focus:ring-0`}
              >
                {usesIconSuffix ? (
                  <span className="flex w-full items-center justify-center">
                    <Proportions className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent>{renderSizeModeOptions(axis)}</SelectContent>
            </Select>
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm bg-white opacity-0 transition-opacity group-hover/unitsuffix:opacity-100 peer-focus-visible/unittrigger:opacity-100 peer-data-[state=open]/unittrigger:opacity-100" style={{ width: usesIconSuffix ? '52px' : '44px' }}>
              <ChevronDown className="h-3.5 w-3.5 text-slate-700" />
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 z-20 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]" style={{ width: usesIconSuffix ? '52px' : '44px' }} />
          </div>
        </div>
      )}
    </div>
  );
}

function renderSizeModeOptions(axis: SizeFieldAxis) {
  const isLengthOnlyAxis = axis === 'x' || axis === 'y';
  const scalarUnits = isLengthOnlyAxis ? ['px'] : ['px', '%'];
  const viewportUnits = ['vw', 'vh', 'vmin', 'vmax'];
  const keywords =
    axis === 'width'
      ? WIDTH_KEYWORD_OPTIONS
      : axis === 'height'
        ? HEIGHT_KEYWORD_OPTIONS
        : null;

  return (
    <>
      {scalarUnits.map((option) => (
        <SelectItem key={`${axis}-${option}`} value={option}>
          {option}
        </SelectItem>
      ))}
      {keywords ? <SelectSeparator /> : null}
      {keywords?.map((option) => (
        <SelectItem key={`${axis}-${option}`} value={option}>
          {option}
        </SelectItem>
      ))}
      <SelectSeparator />
      {viewportUnits.map((option) => (
        <SelectItem key={`${axis}-${option}`} value={option}>
          {option}
        </SelectItem>
      ))}
    </>
  );
}

function OrderIconButton({
  label,
  shortcut,
  onClick,
  disabled,
  compact = false,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <PopoverTooltip
      side="top"
      align="center"
      className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
      content={
        <>
          <div className="leading-3.5 font-medium">{label}</div>
          {shortcut ? <div className="mt-0.5 font-mono text-[10px] font-light leading-3 text-slate-300">{shortcut}</div> : null}
        </>
      }
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={`${compact ? 'h-8 w-8' : 'h-8 w-8'} p-0 text-xs`}
      >
        {children}
      </Button>
    </PopoverTooltip>
  );
}

function TypeIconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <PopoverTooltip
      side="top"
      align="center"
      className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
      content={<div className="leading-3.5 font-medium">{label}</div>}
    >
      <Button
        type="button"
        variant={active ? 'default' : 'outline'}
        size="sm"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className="h-8 w-8 p-0 text-xs"
      >
        {children}
      </Button>
    </PopoverTooltip>
  );
}

function TextStyleIconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <PopoverTooltip
      side="top"
      align="center"
      className="rounded-md border-slate-800 bg-slate-900 px-2 py-1 text-center text-[11px] text-white"
      content={<div className="leading-3.5 font-medium">{label}</div>}
    >
      <Button
        type="button"
        variant={active ? 'default' : 'outline'}
        size="sm"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className="h-8 w-8 p-0 text-xs"
      >
        {children}
      </Button>
    </PopoverTooltip>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <Label className="text-[11px] font-medium text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function FontSizeField({
  nodeId,
  value,
  onChange,
}: {
  nodeId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseFontSizeValue(value);
  const fontSizeSuffixWidth = '44px';
  return (
    <div className="group/sizefield relative flex h-8 overflow-visible rounded-sm border border-slate-200 bg-white shadow-sm transition-[border-color,box-shadow] focus-within:border-blue-500">
      <Input
        type="number"
        min={1}
        step="any"
        value={String(parsed.parsed.value)}
        onChange={(e) => {
          const next = Number.parseFloat(e.target.value);
          if (Number.isFinite(next) && next > 0) {
            onChange(`${next}${parsed.parsed.unit}`);
          }
        }}
        className="peer/valueinput h-full overflow-visible rounded-none border-0 bg-transparent text-[11px] text-slate-600 [appearance:textfield] shadow-none focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 rounded-l-sm shadow-none transition-[box-shadow] peer-focus-visible/valueinput:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]" style={{ right: fontSizeSuffixWidth }} />
      <Select
        value={parsed.parsed.unit}
        onValueChange={(nextUnit) => {
          const converted = convertStageFontSizeToInput(nodeId, nextUnit as FontSizeMode);
          onChange(`${converted ?? parsed.parsed.value}${nextUnit as FontSizeMode}`);
        }}
      >
        <SelectTrigger className="peer/unittrigger relative z-10 h-full justify-center rounded-none border-0 border-l border-slate-200 bg-transparent px-0 text-center text-[10px] font-medium text-slate-800 shadow-none [&>span]:w-full [&>span]:justify-center [&>svg]:hidden focus:border-0 focus:ring-0" style={{ width: fontSizeSuffixWidth }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZE_UNIT_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center justify-center rounded-r-sm bg-white opacity-0 transition-opacity group-hover/sizefield:opacity-100 peer-focus-visible/unittrigger:opacity-100 peer-data-[state=open]/unittrigger:opacity-100" style={{ width: fontSizeSuffixWidth }}>
        <ChevronDown className="h-3.5 w-3.5 text-slate-700" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 rounded-r-sm shadow-none transition-[box-shadow] peer-focus-visible/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)] peer-data-[state=open]/unittrigger:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.4)]" style={{ width: fontSizeSuffixWidth }} />
    </div>
  );
}

function NumberInput({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      step={step}
      value={formatFieldNumber(clampFieldNumber(value))}
      onChange={(e) => {
        const next = Number.parseFloat(e.target.value);
        if (Number.isFinite(next) && next >= min && next <= max) {
          onChange(next);
        }
      }}
      className="h-8 rounded-sm px-2 text-center text-[11px] [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onValueChange,
}: {
  label: string | null;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[11px] font-medium text-slate-500">{label}</Label>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {value}
            {unit}
          </span>
        </div>
      ) : (
        <div className="flex justify-end">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {value}
            {unit}
          </span>
        </div>
      )}
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([next]) => onValueChange(next ?? value)} />
    </div>
  );
}

function StickyOffsetBandField({
  topOffset,
  bottomOffset,
  min,
  max,
  step,
  unit,
  onValueChange,
}: {
  topOffset: number;
  bottomOffset: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onValueChange: (topOffset: number, bottomOffset: number) => void;
}) {
  const topValue = clamp(topOffset, min, max);
  const bottomValue = clamp(bottomOffset, min, max);
  const sliderEndFromTop = clamp(max - bottomValue, min, max);
  const sliderStart = Math.min(topValue, sliderEndFromTop);
  const sliderEnd = Math.max(topValue, sliderEndFromTop);
  const rangeSpan = Math.max(0, sliderEnd - sliderStart);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] font-medium text-slate-500">Offset Range</Label>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          Span {Math.round(rangeSpan)}
          {unit}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600">
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5">
          <ArrowUp className="h-3 w-3 text-slate-500" />
          Top {Math.round(topValue)}
          {unit}
        </span>
        <span className="inline-flex items-center justify-end gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-right">
          Bottom {Math.round(bottomValue)}
          {unit}
          <ArrowDown className="h-3 w-3 text-slate-500" />
        </span>
      </div>
      <Slider
        value={[sliderStart, sliderEnd]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => {
          if (next.length < 2) {
            return;
          }
          const rawStart = next[0] ?? sliderStart;
          const rawEnd = next[1] ?? sliderEnd;
          const nextStart = Math.min(rawStart, rawEnd);
          const nextEnd = Math.max(rawStart, rawEnd);
          const nextTop = clamp(Math.round(nextStart), min, max);
          const nextBottom = clamp(Math.round(max - nextEnd), min, max);
          onValueChange(nextTop, nextBottom);
        }}
      />
    </div>
  );
}

function WrapperActions({
  node,
  canSectionBack,
  canSectionForward,
  onSectionBack,
  onSectionForward,
  onPromote,
  onDemote,
}: {
  node: WrapperNode;
  canSectionBack: boolean;
  canSectionForward: boolean;
  onSectionBack: () => void;
  onSectionForward: () => void;
  onPromote: (role: 'header' | 'footer') => void;
  onDemote: () => void;
}) {
  const currentType =
    node.role === 'section' || node.role === 'header' || node.role === 'footer' ? node.role : null;

  if (node.role === 'section') {
    return (
      <div className="space-y-1.5">
        <div className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-1">
          <Label className="text-[11px] font-medium text-slate-500">Order</Label>
          <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1">
            <OrderIconButton compact label="Move Section Up" onClick={onSectionBack} disabled={!canSectionBack}>
              <ListStart className="h-3.5 w-3.5" />
            </OrderIconButton>
            <OrderIconButton compact label="Move Section Down" onClick={onSectionForward} disabled={!canSectionForward}>
              <ListEnd className="h-3.5 w-3.5" />
            </OrderIconButton>
          </div>
        </div>
        <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
          <Label className="text-[11px] font-medium text-slate-500">Section type</Label>
          <SectionTypeSelector currentType={currentType} onPromote={onPromote} onDemote={onDemote} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[74px_minmax(0,1fr)] items-center gap-1">
      <Label className="text-[11px] font-medium text-slate-500">Section type</Label>
      <SectionTypeSelector currentType={currentType} onPromote={onPromote} onDemote={onDemote} />
    </div>
  );
}

function SectionTypeSelector({
  currentType,
  onPromote,
  onDemote,
}: {
  currentType: 'section' | 'header' | 'footer' | null;
  onPromote: (role: 'header' | 'footer') => void;
  onDemote: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1">
      <TypeIconButton
        label="Set type to Section"
        active={currentType === 'section'}
        onClick={currentType === 'section' ? () => {} : onDemote}
      >
        <BetweenHorizontalStart className="h-3.5 w-3.5" />
      </TypeIconButton>
      <TypeIconButton
        label="Set type to Header"
        active={currentType === 'header'}
        onClick={currentType === 'header' ? () => {} : () => onPromote('header')}
      >
        <PanelTop className="h-3.5 w-3.5" />
      </TypeIconButton>
      <TypeIconButton
        label="Set type to Footer"
        active={currentType === 'footer'}
        onClick={currentType === 'footer' ? () => {} : () => onPromote('footer')}
      >
        <PanelBottom className="h-3.5 w-3.5" />
      </TypeIconButton>
    </div>
  );
}

function normalizeColorInputValue(value: string | undefined) {
  if (value && /^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }
  return '#ffffff';
}

function edgeValue(node: Exclude<DocumentNode, { type: 'site' }>) {
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

function stickyDurationVh(node: Exclude<DocumentNode, { type: 'site' }>) {
  if ((node.sticky?.durationMode ?? 'auto') === 'auto') {
    return 0;
  }
  const duration = node.sticky?.durationTop?.parsed ?? node.sticky?.duration.parsed;
  if (!duration) {
    return 50;
  }
  if (duration.unit === 'vh') {
    return duration.value;
  }
  return 50;
}

function stickyOffsetVh(node: Exclude<DocumentNode, { type: 'site' }>) {
  const offset = node.sticky?.offsetTop?.parsed ?? node.sticky?.offsetBottom?.parsed;
  if (!offset) {
    return 0;
  }
  return offset.unit === 'vh' ? offset.value : 0;
}

function stickyOffsetTopVh(node: Exclude<DocumentNode, { type: 'site' }>) {
  const offset = node.sticky?.offsetTop?.parsed;
  if (!offset) {
    return 0;
  }
  return offset.unit === 'vh' ? offset.value : 0;
}

function stickyOffsetBottomVh(node: Exclude<DocumentNode, { type: 'site' }>) {
  const offset = node.sticky?.offsetBottom?.parsed;
  if (!offset) {
    return 0;
  }
  return offset.unit === 'vh' ? offset.value : 0;
}

function stickyDurationTopVh(node: Exclude<DocumentNode, { type: 'site' }>) {
  if ((node.sticky?.durationMode ?? 'auto') === 'auto') {
    return 0;
  }
  const duration = node.sticky?.durationTop?.parsed ?? node.sticky?.duration.parsed;
  if (!duration) {
    return 50;
  }
  return duration.unit === 'vh' ? duration.value : 50;
}

function fontSizeFieldValue(node: Extract<DocumentNode, { type: 'leaf'; role: 'text' }>) {
  return node.style?.fontSize?.raw ?? '18px';
}

function lineHeightValue(node: Extract<DocumentNode, { type: 'leaf'; role: 'text' }>) {
  return node.style?.lineHeight ?? 1.2;
}

function textDecorationHasUnderline(node: Extract<DocumentNode, { type: 'leaf'; role: 'text' }>) {
  return node.style?.textDecorationLine?.includes('underline') ?? false;
}

function textDecorationHasLineThrough(node: Extract<DocumentNode, { type: 'leaf'; role: 'text' }>) {
  return node.style?.textDecorationLine?.includes('line-through') ?? false;
}

function toggleTextDecorationLine(
  current: 'none' | 'underline' | 'line-through' | 'underline line-through' | undefined,
  target: 'underline' | 'line-through',
) {
  const hasUnderline = current?.includes('underline') ?? false;
  const hasLineThrough = current?.includes('line-through') ?? false;
  const nextUnderline = target === 'underline' ? !hasUnderline : hasUnderline;
  const nextLineThrough = target === 'line-through' ? !hasLineThrough : hasLineThrough;

  if (nextUnderline && nextLineThrough) {
    return 'underline line-through';
  }
  if (nextUnderline) {
    return 'underline';
  }
  if (nextLineThrough) {
    return 'line-through';
  }
  return 'none';
}

function stickyDurationBottomVh(node: Exclude<DocumentNode, { type: 'site' }>) {
  if ((node.sticky?.durationMode ?? 'auto') === 'auto') {
    return 0;
  }
  const duration = node.sticky?.durationBottom?.parsed ?? node.sticky?.duration.parsed;
  if (!duration) {
    return 50;
  }
  return duration.unit === 'vh' ? duration.value : 50;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function describeSizeFieldValue(value: string, axis: SizeFieldAxis): SizeFieldDescriptor {
  const parsed =
    axis === 'width'
      ? parseWidthValue(value)
      : axis === 'height'
        ? parseHeightValue(value)
        : parseUnitValue(value);
  if ('unit' in parsed.parsed) {
    return {
      kind: 'numeric',
      mode: parsed.parsed.unit,
      input: formatNumericFieldInput(parsed.parsed.value, parsed.parsed.unit),
    };
  }
  if (parsed.parsed.keyword === 'aspect-ratio') {
    return {
      kind: 'aspect-ratio',
      mode: 'aspect-ratio',
      input: extractAspectRatioExpression(parsed.raw),
    };
  }
  return {
    kind: 'keyword',
    mode: parsed.parsed.keyword,
    input: '',
  };
}

export function buildSizeFieldValue(axis: SizeFieldAxis, mode: SizeFieldMode, input: string) {
  if (axis === 'x' || axis === 'y') {
    if (mode !== 'px' && mode !== 'vw' && mode !== 'vh' && mode !== 'vmin' && mode !== 'vmax') {
      return null;
    }
    const numeric = input.trim();
    if (!/^-?\d+(?:\.\d+)?$/.test(numeric)) {
      return null;
    }
    const nextRaw = `${numeric}${mode}`;
    try {
      parseUnitValue(nextRaw);
      return nextRaw;
    } catch {
      return null;
    }
  }

  if (mode === 'fit-content' || mode === 'min-content' || mode === 'max-content') {
    return axis === 'width' ? mode : null;
  }
  if (mode === 'auto') {
    return axis === 'height' ? mode : null;
  }
  if (mode === 'aspect-ratio') {
    if (axis !== 'height') {
      return null;
    }
    const normalized = normalizeAspectRatioExpression(input);
    return normalized ? `aspect-ratio(${normalized})` : null;
  }

  const numeric = input.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(numeric)) {
    return null;
  }
  const nextRaw = `${numeric}${mode}`;
  try {
    if (axis === 'width') {
      parseWidthValue(nextRaw);
    } else {
      parseHeightValue(nextRaw);
    }
    return nextRaw;
  } catch {
    return null;
  }
}

export function normalizeAspectRatioExpression(input: string) {
  const trimmed = input.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed) > 0 ? trimmed : null;
  }

  const fractionMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!fractionMatch) {
    return null;
  }

  const left = Number(fractionMatch[1]);
  const right = Number(fractionMatch[2]);
  if (left <= 0 || right <= 0) {
    return null;
  }

  return `${fractionMatch[1]}/${fractionMatch[2]}`;
}

export function convertRenderedPxToUnitValue(
  px: number,
  axis: SizeFieldAxis,
  mode: Extract<SizeFieldMode, 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax'>,
  parentSizePx?: number,
  viewportSizePx?: number,
) {
  if (!Number.isFinite(px)) {
    return null;
  }

  if (mode === 'px') {
    return roundGeometryValue(px);
  }

  if (mode === '%') {
    if ((axis === 'x' || axis === 'y') || !parentSizePx || parentSizePx <= 0) {
      return null;
    }
    return roundGeometryValue((px / parentSizePx) * 100);
  }

  if (mode === 'vw') {
    if (!viewportSizePx || viewportSizePx <= 0) {
      return null;
    }
    return roundGeometryValue((px / viewportSizePx) * 100);
  }

  if (mode === 'vh') {
    if (!viewportSizePx || viewportSizePx <= 0) {
      return null;
    }
    return roundGeometryValue((px / viewportSizePx) * 100);
  }

  if (!viewportSizePx || viewportSizePx <= 0) {
    return null;
  }
  return roundGeometryValue((px / viewportSizePx) * 100);
}

export function convertStageMeasurementToInput(
  nodeId: string,
  axis: SizeFieldAxis,
  mode: Extract<SizeFieldMode, 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax'>,
  ownerDocument: Document = document,
) {
  const measurement = measureStageGeometry(nodeId, ownerDocument);
  if (!measurement) {
    return null;
  }

  const px =
    axis === 'x'
      ? measurement.offsetX
      : axis === 'y'
        ? measurement.offsetY
        : axis === 'width'
          ? measurement.width
          : measurement.height;
  const parentSize =
    axis === 'width'
      ? measurement.parentWidth
      : axis === 'height'
        ? measurement.parentHeight
        : undefined;
  const viewportSize =
    mode === 'vw'
      ? measurement.viewportWidth
      : mode === 'vh'
        ? measurement.viewportHeight
        : mode === 'vmin'
          ? Math.min(measurement.viewportWidth ?? 0, measurement.viewportHeight ?? 0)
          : mode === 'vmax'
            ? Math.max(measurement.viewportWidth ?? 0, measurement.viewportHeight ?? 0)
            : undefined;

  const converted = convertRenderedPxToUnitValue(px, axis, mode, parentSize, viewportSize);
  return converted == null ? null : formatNumericFieldInput(converted, mode);
}

export function convertRenderedPxToFontSizeValue(
  px: number,
  mode: FontSizeMode,
  reference: { rootFontSizePx: number; inheritedFontSizePx: number },
) {
  if (!Number.isFinite(px) || px <= 0) {
    return null;
  }

  if (mode === 'px') {
    return clampFieldNumber(px);
  }

  const base = mode === 'rem' ? reference.rootFontSizePx : reference.inheritedFontSizePx;
  if (!Number.isFinite(base) || base <= 0) {
    return null;
  }
  return clampFieldNumber(px / base);
}

export function convertStageFontSizeToInput(
  nodeId: string,
  mode: FontSizeMode,
  ownerDocument: Document = document,
) {
  const measurement = measureStageFontSize(nodeId, ownerDocument);
  if (!measurement) {
    return null;
  }

  const converted = convertRenderedPxToFontSizeValue(measurement.fontSizePx, mode, {
    rootFontSizePx: measurement.rootFontSizePx,
    inheritedFontSizePx: measurement.inheritedFontSizePx,
  });
  return converted == null ? null : formatFieldNumber(converted);
}

function measureStageGeometry(nodeId: string, ownerDocument: Document) {
  const element = ownerDocument.getElementById(`stage-node-${nodeId}`);
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  const parentContent =
    element.parentElement?.closest<HTMLElement>('[data-content-wrapper-for]') ??
    element.parentElement;
  const parentRect = parentContent?.getBoundingClientRect();

  return {
    width: rect.width,
    height: rect.height,
    offsetX: parentRect ? rect.left - parentRect.left : rect.left,
    offsetY: parentRect ? rect.top - parentRect.top : rect.top,
    parentWidth: parentRect?.width,
    parentHeight: parentRect?.height,
    viewportWidth: ownerDocument.defaultView?.innerWidth,
    viewportHeight: ownerDocument.defaultView?.innerHeight,
  };
}

function measureStageFontSize(nodeId: string, ownerDocument: Document) {
  const element = ownerDocument.getElementById(`stage-node-${nodeId}`);
  const defaultView = ownerDocument.defaultView;
  if (!element || !defaultView) {
    return null;
  }

  const computed = defaultView.getComputedStyle(element);
  const parentComputed = defaultView.getComputedStyle(element.parentElement ?? element);
  const rootComputed = defaultView.getComputedStyle(ownerDocument.documentElement);
  const fontSizePx = Number.parseFloat(computed.fontSize);
  const inheritedFontSizePx = Number.parseFloat(parentComputed.fontSize);
  const rootFontSizePx = Number.parseFloat(rootComputed.fontSize);
  if (!Number.isFinite(fontSizePx) || !Number.isFinite(inheritedFontSizePx) || !Number.isFinite(rootFontSizePx)) {
    return null;
  }

  return {
    fontSizePx,
    inheritedFontSizePx,
    rootFontSizePx,
  };
}

function roundGeometryValue(value: number) {
  return Math.round(value * 1000) / 1000;
}

function formatNumericFieldInput(
  value: number,
  unit: Extract<SizeFieldMode, 'px' | '%' | 'vw' | 'vh' | 'vmin' | 'vmax'>,
) {
  return formatFieldNumber(unit === 'px' ? clampFieldNumber(value) : clampFieldNumber(value));
}

function clampFieldNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function formatFieldNumber(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function extractAspectRatioExpression(raw: string) {
  const match = raw.trim().match(/^aspect-ratio\(\s*(.+?)\s*\)$/);
  return match?.[1] ?? '16/9';
}

function getInitialNumericDraft(value: string, axis: SizeFieldAxis) {
  const descriptor = describeSizeFieldValue(value, axis);
  return descriptor.kind === 'numeric' ? descriptor.input : getDefaultNumericDraft(axis);
}

function getInitialAspectDraft(value: string) {
  try {
    const descriptor = describeSizeFieldValue(value, 'height');
    return descriptor.kind === 'aspect-ratio' ? descriptor.input : '16/9';
  } catch {
    return '16/9';
  }
}

function getDefaultNumericDraft(axis: SizeFieldAxis) {
  if (axis === 'width') {
    return '240';
  }
  if (axis === 'height') {
    return '120';
  }
  return '0';
}
