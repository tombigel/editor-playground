import { LinkContentSection, LinkDesignSection, LinkTextStyleSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, propertiesSection, summaryBlock } from './config.common';
import type { InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition, LinkInspectorNode } from './types';

const linkContentSection: InspectorSectionDefinition = {
  id: 'link-content',
  render: ({ node, actions }) =>
    isLinkNode(node) ? <LinkContentSection node={node} onTextChange={actions.onTextChange} /> : null,
};

const linkStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions, focusedMode }) =>
    isLinkNode(node) ? <StickySection node={node} actions={actions} focusedMode={focusedMode} /> : null,
};

const linkDesignSection: InspectorSectionDefinition = {
  id: 'link-design',
  render: ({ node, actions }) =>
    isLinkNode(node) ? <LinkDesignSection node={node} onTextChange={actions.onTextChange} /> : null,
};

const linkTextStyleSection: InspectorSectionDefinition = {
  id: 'link-text-style',
  render: ({ document, node, actions }) =>
    isLinkNode(node) ? (
      <LinkTextStyleSection
        document={document}
        node={node}
        onTextChange={actions.onTextChange}
        onOpenManageFonts={actions.onOpenManageFonts ?? (() => undefined)}
      />
    ) : null,
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
    id: 'text-style',
    bucket: 'primary',
    title: 'Text style',
    description: 'Typography and wrapping controls.',
    sections: [linkTextStyleSection],
  }),
  createSectionBlock({
    id: 'design',
    bucket: 'primary',
    title: 'Design',
    description: 'Link color and shadow treatment.',
    sections: [linkDesignSection],
  }),
  createSectionBlock({
    id: 'sticky-behavior',
    bucket: 'behavior',
    title: 'Sticky behavior',
    description: 'Target, offsets, and duration behavior.',
    sections: [linkStickySection],
  }),
  createSectionBlock({
    id: 'properties',
    bucket: 'primary',
    title: 'Properties',
    description: 'Component metadata.',
    sections: [propertiesSection],
  }),
];

function isLinkNode(node: InspectorNode | null): node is LinkInspectorNode {
  return Boolean(node && node.type === 'leaf' && node.role === 'link');
}
