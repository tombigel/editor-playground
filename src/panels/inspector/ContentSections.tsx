import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  PilcrowLeft,
  PilcrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FontSizeField, FormField, NumberInput, TextStyleIconButton } from '../InspectorControls';
import type {
  ButtonInspectorNode,
  ImageInspectorNode,
  LinkInspectorNode,
  TextInspectorNode,
} from './types';
import type { EditorTextField } from '../../api/documentApi';

export function TextContentSection({
  node,
  onTextChange,
}: {
  node: TextInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  return (
    <Card className="editor-border-subtle rounded-lg shadow-none">
      <CardHeader className="px-3 pt-3 pb-1">
        <CardTitle className="text-xs">Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 px-3 pt-1.5 pb-3">
        <FormField label="Text">
          <Textarea value={node.content} onChange={(e) => onTextChange('content', e.target.value)} />
        </FormField>
        <div className="space-y-1.5">
          <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-1">
            <Label className="text-[11px] font-medium">Size</Label>
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
            <Label className="text-[11px] font-medium">Style</Label>
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
                onClick={() => onTextChange('fontStyle', node.style?.fontStyle === 'italic' ? 'normal' : 'italic')}
              >
                <span className="font-medium italic">I</span>
              </TextStyleIconButton>
              <TextStyleIconButton
                label="Underline"
                active={textDecorationHasUnderline(node)}
                onClick={() =>
                  onTextChange('textDecorationLine', toggleTextDecorationLine(node.style?.textDecorationLine, 'underline'))
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
            <Label className="text-[11px] font-medium">Alignment</Label>
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
                onClick={() => onTextChange('direction', (node.style?.direction ?? 'ltr') === 'rtl' ? 'ltr' : 'rtl')}
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
            <Label className="text-[11px] font-medium">HTML tag</Label>
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
  );
}

export function ButtonContentSection({
  node,
  onTextChange,
}: {
  node: ButtonInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  return (
    <Card className="editor-border-subtle rounded-lg shadow-none">
      <CardHeader className="px-3 pt-3 pb-1">
        <CardTitle className="text-xs">Content</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pt-1.5 pb-3">
        <FormField label="Label">
          <Input value={node.label} onChange={(e) => onTextChange('label', e.target.value)} />
        </FormField>
      </CardContent>
    </Card>
  );
}

export function LinkContentSection({
  node,
  onTextChange,
}: {
  node: LinkInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  return (
    <Card className="editor-border-subtle rounded-lg shadow-none">
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
  );
}

export function ImageContentSection({
  node,
  onTextChange,
}: {
  node: ImageInspectorNode;
  onTextChange: (field: EditorTextField, value: string) => void;
}) {
  return (
    <Card className="editor-border-subtle rounded-lg shadow-none">
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
  );
}

function fontSizeFieldValue(node: TextInspectorNode) {
  return node.style?.fontSize?.raw ?? '18px';
}

function lineHeightValue(node: TextInspectorNode) {
  return node.style?.lineHeight ?? 1.2;
}

function textDecorationHasUnderline(node: TextInspectorNode) {
  return node.style?.textDecorationLine?.includes('underline') ?? false;
}

function textDecorationHasLineThrough(node: TextInspectorNode) {
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
