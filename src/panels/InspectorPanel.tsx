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
  ArrowDownToLine,
  ArrowUpToLine,
  ListEnd,
  ListStart,
  ListX,
} from 'lucide-react';
import type { DocumentNode, WrapperNode } from '../api/documentApi';
import { parseHeightValue, parseUnitValue, parseWidthValue } from '../api/documentApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PopoverTooltip } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

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
              <InlineField
                label="X"
                value={node.rect.x.base.raw}
                onChange={(value) => onRectChange('x', value)}
                validate={(value) => validateUnitField(value, 'x')}
              />
              <InlineField
                label="Y"
                value={node.rect.y.base.raw}
                onChange={(value) => onRectChange('y', value)}
                validate={(value) => validateUnitField(value, 'y')}
              />
              <InlineField
                label="W"
                value={node.rect.width.base.raw}
                onChange={(value) => onRectChange('width', value)}
                validate={(value) => validateUnitField(value, 'width')}
              />
              <InlineField
                label="H"
                value={node.rect.height.base.raw}
                onChange={(value) => onRectChange('height', value)}
                validate={(value) => validateUnitField(value, 'height')}
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
              <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
                <FormField label="Background">
                  <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1">
                    <input
                      type="color"
                      className="h-8 w-9 rounded-md border-0 bg-transparent p-0"
                      value={normalizeColorInputValue(node.style.background)}
                      onChange={(e) => onWrapperStyleChange('background', e.target.value)}
                    />
                    <div className="text-xs text-slate-500">{normalizeColorInputValue(node.style.background)}</div>
                  </div>
                </FormField>
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
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-slate-500">
                    Text style
                  </Label>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                    <InlineParsedInput
                      value={node.style?.fontSize?.raw ?? '18px'}
                      onChange={(value) => onTextChange('fontSize', value)}
                      validate={(value) => {
                        try {
                          parseUnitValue(value);
                          return true;
                        } catch {
                          return false;
                        }
                      }}
                      placeholder="18px"
                    />
                    <Button
                      type="button"
                      variant={node.style?.fontWeight === 'bold' ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 min-w-8 px-2 text-xs font-bold"
                      onClick={() =>
                        onTextChange('fontWeight', node.style?.fontWeight === 'bold' ? 'normal' : 'bold')
                      }
                    >
                      B
                    </Button>
                    <Button
                      type="button"
                      variant={node.style?.fontStyle === 'italic' ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 min-w-8 px-2 text-xs italic"
                      onClick={() =>
                        onTextChange('fontStyle', node.style?.fontStyle === 'italic' ? 'normal' : 'italic')
                      }
                    >
                      I
                    </Button>
                  </div>
                  <div className="grid grid-cols-[88px_auto_auto_auto] items-center gap-2">
                    <InlineNumberInput
                      value={node.style?.lineHeight?.toFixed(1) ?? '1.2'}
                      onChange={(value) => onTextChange('lineHeight', value)}
                      validate={(value) => {
                        const parsed = Number.parseFloat(value);
                        return Number.isFinite(parsed) && parsed > 0 && parsed <= 4;
                      }}
                      placeholder="1.2"
                    />
                    <Button
                      type="button"
                      variant={(node.style?.textAlign ?? 'left') === 'left' ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 min-w-8 px-2"
                      onClick={() => onTextChange('textAlign', 'left')}
                    >
                      <AlignLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant={node.style?.textAlign === 'center' ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 min-w-8 px-2"
                      onClick={() => onTextChange('textAlign', 'center')}
                    >
                      <AlignCenter className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant={node.style?.textAlign === 'right' ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 min-w-8 px-2"
                      onClick={() => onTextChange('textAlign', 'right')}
                    >
                      <AlignRight className="h-3.5 w-3.5" />
                    </Button>
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

function Field({
  label,
  value,
  onChange,
  validate,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  validate?: (value: string) => boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDraft(value);
    setInvalid(false);
  }, [value]);

  return (
    <FormField label={label}>
      <Input
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          if (!validate) {
            onChange(next);
            return;
          }
          const isValid = validate(next);
          setInvalid(!isValid);
          if (isValid) {
            onChange(next);
          }
        }}
        className={`h-8 rounded-sm text-[11px] ${invalid ? 'border-red-400 bg-red-50 focus-visible:ring-red-300' : ''}`}
      />
    </FormField>
  );
}

function InlineField({
  label,
  value,
  onChange,
  validate,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  validate?: (value: string) => boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDraft(value);
    setInvalid(false);
  }, [value]);

  return (
    <div className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-1">
      <Label className="text-[11px] font-medium text-slate-500">{label}</Label>
      <Input
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          if (!validate) {
            onChange(next);
            return;
          }
          const isValid = validate(next);
          setInvalid(!isValid);
          if (isValid) {
            onChange(next);
          }
        }}
        className={`h-8 rounded-sm text-[11px] ${invalid ? 'border-red-400 bg-red-50 focus-visible:ring-red-300' : ''}`}
      />
    </div>
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
          {shortcut ? <div className="mt-0.5 leading-3 text-[10px] font-normal text-slate-300">{shortcut}</div> : null}
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
        className={`${compact ? 'h-6 w-6' : 'h-7 w-7'} rounded-sm p-0`}
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

function InlineParsedInput({
  value,
  onChange,
  validate,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  validate: (value: string) => boolean;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDraft(value);
    setInvalid(false);
  }, [value]);

  return (
    <Input
      value={draft}
      placeholder={placeholder}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        const isValid = validate(next);
        setInvalid(!isValid);
        if (isValid) {
          onChange(next);
        }
      }}
      className={`h-8 rounded-sm text-[11px] ${invalid ? 'border-red-400 bg-red-50 focus-visible:ring-red-300' : ''}`}
    />
  );
}

function InlineNumberInput({
  value,
  onChange,
  validate,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  validate: (value: string) => boolean;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDraft(value);
    setInvalid(false);
  }, [value]);

  return (
    <Input
      value={draft}
      placeholder={placeholder}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        const isValid = validate(next);
        setInvalid(!isValid);
        if (isValid) {
          onChange(next);
        }
      }}
      className={`h-8 rounded-sm text-[11px] ${invalid ? 'border-red-400 bg-red-50 focus-visible:ring-red-300' : ''}`}
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
  if (node.role === 'section') {
    return (
      <div className="grid grid-cols-2 gap-1.5">
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
        <div className="grid grid-cols-[30px_minmax(0,1fr)] items-center gap-1">
          <Label className="text-[11px] font-medium text-slate-500">Role</Label>
          <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1">
            <OrderIconButton compact label="To Header" onClick={() => onPromote('header')} disabled={false}>
              <ArrowUpToLine className="h-3.5 w-3.5" />
            </OrderIconButton>
            <OrderIconButton compact label="To Footer" onClick={() => onPromote('footer')} disabled={false}>
              <ArrowDownToLine className="h-3.5 w-3.5" />
            </OrderIconButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-1">
      <Label className="text-[11px] font-medium text-slate-500">Role</Label>
      <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1">
        {node.role === 'container' ? (
          <>
            <OrderIconButton compact label="To Header" onClick={() => onPromote('header')} disabled={false}>
              <ArrowUpToLine className="h-3.5 w-3.5" />
            </OrderIconButton>
            <OrderIconButton compact label="To Footer" onClick={() => onPromote('footer')} disabled={false}>
              <ArrowDownToLine className="h-3.5 w-3.5" />
            </OrderIconButton>
          </>
        ) : (
          <OrderIconButton compact label="Demote to Section" onClick={onDemote} disabled={false}>
            <ListX className="h-3.5 w-3.5" />
          </OrderIconButton>
        )}
      </div>
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

function validateUnitField(value: string, field: 'x' | 'y' | 'width' | 'height') {
  try {
    if (field === 'width') {
      parseWidthValue(value);
    } else if (field === 'height') {
      parseHeightValue(value);
    } else {
      parseUnitValue(value);
    }
    return true;
  } catch {
    return false;
  }
}
