import { TextContentSection, TextDesignSection, TextTextStyleSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, propertiesSection, summaryBlock } from './config.common';
import type { InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition, TextInspectorNode } from './types';

const textContentSection: InspectorSectionDefinition = {
  id: 'text-content',
  render: ({ node, actions }) =>
    isTextNode(node) ? <TextContentSection node={node} onTextChange={actions.onTextChange} /> : null,
};

const textDesignSection: InspectorSectionDefinition = {
  id: 'text-design',
  render: ({ node, actions }) =>
    isTextNode(node) ? <TextDesignSection node={node} onTextChange={actions.onTextChange} /> : null,
};

const textTextStyleSection: InspectorSectionDefinition = {
  id: 'text-text-style',
  render: ({ document, node, actions }) =>
    isTextNode(node) ? (
      <TextTextStyleSection
        document={document}
        node={node}
        onTextChange={actions.onTextChange}
        onOpenManageFonts={actions.onOpenManageFonts ?? (() => undefined)}
      />
    ) : null,
};

const textStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions, focusedMode }) =>
    isTextNode(node) ? <StickySection node={node} actions={actions} focusedMode={focusedMode} /> : null,
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
  createSectionBlock({
    id: 'sticky-behavior',
    bucket: 'behavior',
    title: 'Sticky behavior',
    description: 'Target, offsets, and duration behavior.',
    sections: [textStickySection],
  }),
  createSectionBlock({
    id: 'properties',
    bucket: 'primary',
    title: 'Properties',
    description: 'Component metadata.',
    sections: [propertiesSection],
  }),
];

function isTextNode(node: InspectorNode | null): node is TextInspectorNode {
  return Boolean(node && node.type === 'leaf' && node.role === 'text');
}
