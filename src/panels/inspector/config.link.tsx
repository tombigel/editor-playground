import { LinkContentSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, summaryBlock } from './config.common';
import type { InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition, LinkInspectorNode } from './types';

const linkContentSection: InspectorSectionDefinition = {
  id: 'link-content',
  render: ({ node, actions }) =>
    isLinkNode(node) ? <LinkContentSection node={node} onTextChange={actions.onTextChange} /> : null,
};

const linkStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions }) =>
    isLinkNode(node) ? <StickySection node={node} actions={actions} /> : null,
};

export const LINK_INSPECTOR_CONFIG: readonly InspectorBlockDefinition[] = [
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
    description: 'Link label and destination fields.',
    sections: [linkContentSection],
  }),
  createSectionBlock({
    id: 'sticky-behavior',
    bucket: 'behavior',
    title: 'Sticky behavior',
    description: 'Target, offsets, and duration behavior.',
    sections: [linkStickySection],
  }),
];

function isLinkNode(node: InspectorNode | null): node is LinkInspectorNode {
  return Boolean(node && node.type === 'leaf' && node.role === 'link');
}
