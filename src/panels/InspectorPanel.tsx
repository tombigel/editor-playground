import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import type { DocumentNode, WrapperNode } from '../model/types';
import { parseHeightValue, parseUnitValue, parseWidthValue } from '../model/units';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  node: DocumentNode | null;
  onTextChange: (field: string, value: string) => void;
  onWrapperStyleChange: (field: 'background', value: string) => void;
  onRectChange: (field: 'x' | 'y' | 'width' | 'height', value: string) => void;
  onPromote: (role: 'header' | 'footer') => void;
  onDemote: () => void;
  onStickyEnabled: (enabled: boolean) => void;
  onStickyTarget: (target: 'self' | 'contentWrapper') => void;
  onStickyEdges: (edge: 'top' | 'bottom' | 'both') => void;
  onStickyOffset: (value: number) => void;
  onStickyDurationMode: (value: 'auto' | 'custom') => void;
  onStickyDuration: (value: number) => void;
};

export function InspectorPanel({
  node,
  onTextChange,
  onWrapperStyleChange,
  onRectChange,
  onPromote,
  onDemote,
  onStickyEnabled,
  onStickyTarget,
  onStickyEdges,
  onStickyOffset,
  onStickyDurationMode,
  onStickyDuration,
}: Props) {
  if (!node) {
    return (
      <div className="flex h-full flex-col gap-2 p-3 text-sm">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Inspector</div>
          <div className="mt-1 text-xs text-slate-600">Select a node to inspect its layout and sticky config.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-auto p-3 text-sm">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Inspector</div>
        <div className="mt-0.5 flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-slate-950">{node.name}</h2>
          {node.type !== 'site' ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
              {node.type === 'wrapper' ? node.role : node.role}
            </span>
          ) : null}
        </div>
      </div>

      <Card className="rounded-xl border-slate-200 shadow-none">
        <CardHeader className="px-4 pt-4 pb-1.5">
          <CardTitle className="text-sm">Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pt-2 pb-4">
          <FormField label="Name">
            <Input value={node.name} onChange={(e) => onTextChange('name', e.target.value)} />
          </FormField>
          {node.type === 'wrapper' ? (
            <WrapperActions node={node} onPromote={onPromote} onDemote={onDemote} />
          ) : null}
        </CardContent>
      </Card>

      {node.type !== 'site' ? (
        <>
          <Card className="rounded-xl border-slate-200 shadow-none">
            <CardHeader className="px-4 pt-4 pb-1.5">
              <CardTitle className="text-sm">Frame</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pt-2 pb-4">
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="X"
                  value={node.rect.x.base.raw}
                  onChange={(value) => onRectChange('x', value)}
                  validate={(value) => validateUnitField(value, 'x')}
                />
                <Field
                  label="Y"
                  value={node.rect.y.base.raw}
                  onChange={(value) => onRectChange('y', value)}
                  validate={(value) => validateUnitField(value, 'y')}
                />
                <Field
                  label="Width"
                  value={node.rect.width.base.raw}
                  onChange={(value) => onRectChange('width', value)}
                  validate={(value) => validateUnitField(value, 'width')}
                />
                <Field
                  label="Height"
                  value={node.rect.height.base.raw}
                  onChange={(value) => onRectChange('height', value)}
                  validate={(value) => validateUnitField(value, 'height')}
                />
              </div>
            </CardContent>
          </Card>

          {node.type === 'wrapper' ? (
            <Card className="rounded-xl border-slate-200 shadow-none">
              <CardHeader className="px-4 pt-4 pb-1.5">
                <CardTitle className="text-sm">Design</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pt-2 pb-4">
                <FormField label="Background">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
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
            <Card className="rounded-xl border-slate-200 shadow-none">
              <CardHeader className="px-4 pt-4 pb-1.5">
                <CardTitle className="text-sm">Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pt-2 pb-4">
                <FormField label="Text">
                  <Textarea value={node.content} onChange={(e) => onTextChange('content', e.target.value)} />
                </FormField>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
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
            <Card className="rounded-xl border-slate-200 shadow-none">
              <CardHeader className="px-4 pt-4 pb-1.5">
                <CardTitle className="text-sm">Content</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pt-2 pb-4">
                <FormField label="Label">
                  <Input value={node.label} onChange={(e) => onTextChange('label', e.target.value)} />
                </FormField>
              </CardContent>
            </Card>
          ) : null}

          {node.type === 'leaf' && node.role === 'link' ? (
            <Card className="rounded-xl border-slate-200 shadow-none">
              <CardHeader className="px-4 pt-4 pb-1.5">
                <CardTitle className="text-sm">Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pt-2 pb-4">
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
            <Card className="rounded-xl border-slate-200 shadow-none">
              <CardHeader className="px-4 pt-4 pb-1.5">
                <CardTitle className="text-sm">Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pt-2 pb-4">
                <FormField label="Src">
                  <Input value={node.src ?? ''} onChange={(e) => onTextChange('src', e.target.value)} />
                </FormField>
                <FormField label="Alt">
                  <Input value={node.alt ?? ''} onChange={(e) => onTextChange('alt', e.target.value)} />
                </FormField>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-xl border-slate-200 shadow-none">
            <CardHeader className="px-4 pt-4 pb-1.5">
              <CardTitle className="text-sm">Sticky</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 pt-2 pb-4">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                <div>
                  <div className="text-xs font-medium text-slate-900">Enabled</div>
                  <div className="text-[11px] text-slate-500">Pin this node inside its structural range.</div>
                </div>
                <Switch checked={Boolean(node.sticky?.enabled)} onCheckedChange={onStickyEnabled} />
              </div>

              {node.sticky?.enabled ? (
                <>
                  {node.type === 'wrapper' ? (
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

                  <RangeField label="Offset" value={stickyOffsetVh(node)} min={0} max={100} step={1} unit="vh" onValueChange={onStickyOffset} />

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
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
                      <RangeField
                        label={null}
                        value={stickyDurationVh(node)}
                        min={0}
                        max={400}
                        step={25}
                        unit="vh"
                        onValueChange={onStickyDuration}
                      />
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        Uses the owner section height as the sticky distance.
                      </div>
                    )}
                  </div>
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
        className={`h-9 text-xs ${invalid ? 'border-red-400 bg-red-50 focus-visible:ring-red-300' : ''}`}
      />
    </FormField>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</Label>
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
      className={`h-8 text-xs ${invalid ? 'border-red-400 bg-red-50 focus-visible:ring-red-300' : ''}`}
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
      className={`h-8 text-xs ${invalid ? 'border-red-400 bg-red-50 focus-visible:ring-red-300' : ''}`}
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
    <div className="space-y-1.5">
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</Label>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {value}
            {unit}
          </span>
        </div>
      ) : (
        <div className="flex justify-end">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {value}
            {unit}
          </span>
        </div>
      )}
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([next]) => onValueChange(next ?? value)} />
    </div>
  );
}

function WrapperActions({
  node,
  onPromote,
  onDemote,
}: {
  node: WrapperNode;
  onPromote: (role: 'header' | 'footer') => void;
  onDemote: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Role</div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
          {node.role}
        </span>
        {node.role === 'section' || node.role === 'container' ? (
          <>
            <Button variant="outline" size="sm" onClick={() => onPromote('header')}>
              Promote to header
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPromote('footer')}>
              Promote to footer
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={onDemote}>
            Demote to section
          </Button>
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
  const duration = node.sticky?.duration.parsed;
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
