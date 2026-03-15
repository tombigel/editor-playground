import { TextContentSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, summaryBlock } from './config.common';
import type { InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition, TextInspectorNode } from './types';

const textContentSection: InspectorSectionDefinition = {
  id: 'text-content',
  render: ({ node, actions }) =>
    isTextNode(node) ? <TextContentSection node={node} onTextChange={actions.onTextChange} /> : null,
};

const textStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions }) =>
    isTextNode(node) ? <StickySection node={node} actions={actions} /> : null,
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
    description: 'Copy and typography fields for text nodes.',
    sections: [textContentSection],
  }),
  createSectionBlock({
    id: 'sticky-behavior',
    bucket: 'behavior',
    title: 'Sticky behavior',
    description: 'Target, offsets, and duration behavior.',
    sections: [textStickySection],
  }),
];

function isTextNode(node: InspectorNode | null): node is TextInspectorNode {
  return Boolean(node && node.type === 'leaf' && node.role === 'text');
}
