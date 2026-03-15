import { ImageContentSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, summaryBlock } from './config.common';
import type { ImageInspectorNode, InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition } from './types';

const imageContentSection: InspectorSectionDefinition = {
  id: 'image-content',
  render: ({ node, actions }) =>
    isImageNode(node) ? <ImageContentSection node={node} onTextChange={actions.onTextChange} /> : null,
};

const imageStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions }) =>
    isImageNode(node) ? <StickySection node={node} actions={actions} /> : null,
};

export const IMAGE_INSPECTOR_CONFIG: readonly InspectorBlockDefinition[] = [
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
    description: 'Image source and alt text fields.',
    sections: [imageContentSection],
  }),
  createSectionBlock({
    id: 'sticky-behavior',
    bucket: 'behavior',
    title: 'Sticky behavior',
    description: 'Target, offsets, and duration behavior.',
    sections: [imageStickySection],
  }),
];

function isImageNode(node: InspectorNode | null): node is ImageInspectorNode {
  return Boolean(node && node.type === 'leaf' && node.role === 'image');
}
