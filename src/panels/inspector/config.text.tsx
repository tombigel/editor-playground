import { TextAppearanceSection, TextContentSection, RichTextContentSection, CodeContentSection, TextDesignSection, TextTextStyleSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, summaryBlock } from './config.common';
import { isTextNode as isTextNodeGuard } from '../../model/types';
import type { TextSubtype } from '../../model/types';
import { Button } from '@/components/ui/button';
import type { InspectorActionHandlers, InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition, TextInspectorNode } from './types';

const textDesignSection: InspectorSectionDefinition = {
  id: 'text-design',
  render: ({ node, actions, focusedMode }) =>
    isTextNode(node) ? (
      <TextDesignSection
        node={node}
        onTextChange={actions.onTextChange}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

const textTextStyleSection: InspectorSectionDefinition = {
  id: 'text-text-style',
  render: ({ document, node, actions, focusedMode }) =>
    isTextNode(node) ? (
      <TextTextStyleSection
        document={document}
        node={node}
        onTextChange={actions.onTextChange}
        onOpenManageFonts={actions.onOpenManageFonts ?? (() => undefined)}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

export const textAppearanceSection: InspectorSectionDefinition = {
  id: 'text-appearance',
  render: ({ document, node, actions, focusedMode }) =>
    isTextNode(node) ? (
      <TextAppearanceSection
        document={document}
        node={node}
        onTextChange={actions.onTextChange}
        onOpenManageFonts={actions.onOpenManageFonts ?? (() => undefined)}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

const TEXT_SUBTYPES: { value: TextSubtype; label: string }[] = [
  { value: 'block', label: 'Text' },
  { value: 'rich', label: 'Rich' },
  { value: 'code', label: 'Code' },
];

function SubtypeSwitcher({ node, actions }: { node: InspectorNode | null; actions: InspectorActionHandlers }) {
  if (!node || !isTextNodeGuard(node)) return null;
  const current = node.subtype as TextSubtype;
  return (
    <div className="editor-bg-subtle editor-border-subtle inline-flex rounded-lg border p-0.5">
      {TEXT_SUBTYPES.map(({ value, label }) => (
        <Button
          key={value}
          type="button"
          variant={current === value ? 'default' : 'ghost'}
          size="sm"
          className="h-6 rounded-md px-2 text-[11px]"
          onClick={() => actions.onSwitchTextSubtype(node.id, value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}

const textContentSection: InspectorSectionDefinition = {
  id: 'text-content',
  render: ({ document, node, actions, focusedMode }) => {
    if (!node || !isTextNodeGuard(node)) return null;
    const switcher = <SubtypeSwitcher node={node} actions={actions} />;
    if (node.subtype === 'block') {
      return (
        <TextContentSection
          document={document}
          node={node}
          onTextChange={actions.onTextChange}
          focusedMode={focusedMode}
          onEnterFocusedMode={actions.onEnterFocusedMode}
          headerContent={switcher}
        />
      );
    }
    if (node.subtype === 'rich') return <RichTextContentSection node={node} headerContent={switcher} />;
    if (node.subtype === 'code') {
      return <CodeContentSection node={node} onTextChange={actions.onTextChange} headerContent={switcher} />;
    }
    return null;
  },
};

const textStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions, focusedMode, globalStickyElevation }) =>
    isTextNode(node) ? <StickySection node={node} actions={actions} focusedMode={focusedMode} globalStickyElevation={globalStickyElevation} /> : null,
};

export const TEXT_INSPECTOR_CONFIG: readonly InspectorBlockDefinition[] = [
  summaryBlock,
  createSectionBlock({
    id: 'layout',
    bucket: 'primary',
    title: 'Layout',
    description: 'Position, sizing, and ordering.',
    sections: [basicsSection],
  }),
  createSectionBlock({
    id: 'sticky-behavior',
    bucket: 'behavior',
    title: 'Sticky behavior',
    description: 'Target, offsets, and duration behavior.',
    sections: [textStickySection],
  }),
  createSectionBlock({
    id: 'content',
    bucket: 'primary',
    title: 'Content',
    description: 'Copy fields for text nodes.',
    sections: [textContentSection],
  }),
  createSectionBlock({
    id: 'text-style',
    bucket: 'primary',
    title: 'Text style',
    description: 'Typography and semantic text controls.',
    sections: [textTextStyleSection],
  }),
  createSectionBlock({
    id: 'design',
    bucket: 'primary',
    title: 'Design',
    description: 'Color and shadow treatment.',
    sections: [textDesignSection],
  }),
];

function isTextNode(node: InspectorNode | null): node is TextInspectorNode {
  return Boolean(node && isTextNodeGuard(node) && node.subtype === 'block' && node.link === undefined);
}

