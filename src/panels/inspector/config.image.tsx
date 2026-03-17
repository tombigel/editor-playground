import { ImageContentSection, ImageDesignSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, propertiesSection, summaryBlock } from './config.common';
import type { ImageInspectorNode, InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition } from './types';

const imageContentSection: InspectorSectionDefinition = {
  id: 'image-content',
  render: ({ node, actions }) =>
    isImageNode(node) ? <ImageContentSection node={node} onTextChange={actions.onTextChange} /> : null,
};

const imageStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions, focusedMode }) =>
    isImageNode(node) ? <StickySection node={node} actions={actions} focusedMode={focusedMode} /> : null,
};

const imageDesignSection: InspectorSectionDefinition = {
  id: 'image-design',
  render: ({ node, actions }) =>
    isImageNode(node) ? <ImageDesignSection node={node} onTextChange={actions.onTextChange} /> : null,
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
    id: 'design',
    bucket: 'primary',
    title: 'Design',
    description: 'Border, radius, and shadow styling.',
    sections: [imageDesignSection],
  }),
  createSectionBlock({
    id: 'sticky-behavior',
    bucket: 'behavior',
    title: 'Sticky behavior',
    description: 'Target, offsets, and duration behavior.',
    sections: [imageStickySection],
  }),
  createSectionBlock({
    id: 'properties',
    bucket: 'primary',
    title: 'Properties',
    description: 'Component metadata.',
    sections: [propertiesSection],
  }),
];

function isImageNode(node: InspectorNode | null): node is ImageInspectorNode {
  return Boolean(node && node.type === 'leaf' && node.role === 'image');
}
