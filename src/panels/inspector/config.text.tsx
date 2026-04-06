import { TextAppearanceSection, TextContentSection, RichTextContentSection, TextDesignSection, TextTextStyleSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, summaryBlock } from './config.common';
import { isTextNode as isTextNodeGuard } from '../../model/types';
import type { TextSubtype } from '../../model/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition, TextInspectorNode } from './types';

const textContentSection: InspectorSectionDefinition = {
  id: 'text-content',
  render: ({ document, node, actions, focusedMode }) =>
    isTextNode(node) ? (
      <TextContentSection
        document={document}
        node={node}
        onTextChange={actions.onTextChange}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

const richTextContentSection: InspectorSectionDefinition = {
  id: 'rich-text-content',
  render: ({ node }) =>
    isRichTextNode(node) ? <RichTextContentSection node={node} /> : null,
};

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

const textSubtypeSwitcherSection: InspectorSectionDefinition = {
  id: 'text-subtype-switcher',
  render: ({ node, actions }) => {
    if (!node || !isTextNodeGuard(node) || !['block', 'rich', 'code'].includes(node.subtype)) return null;
    const current = node.subtype as TextSubtype;
    return (
      <div className="px-3 pb-2 pt-1.5">
        <Tabs value={current} onValueChange={(v) => actions.onSwitchTextSubtype(node.id, v as TextSubtype)}>
          <TabsList className="w-full">
            {TEXT_SUBTYPES.map(({ value, label }) => (
              <TabsTrigger key={value} value={value} size="small" className="flex-1">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    );
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
    sections: [textSubtypeSwitcherSection, textContentSection, richTextContentSection],
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

function isRichTextNode(node: InspectorNode | null): node is TextInspectorNode {
  return Boolean(node && isTextNodeGuard(node) && node.subtype === 'rich');
}
