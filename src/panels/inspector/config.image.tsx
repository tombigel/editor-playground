import { AnimationSection } from './AnimationSection';
import { ImageContentSection, ImageDesignSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, summaryBlock } from './config.common';
import { isMediaNode } from '../../api/documentViewApi';
import type { ImageInspectorNode, InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition } from './types';

const imageContentSection: InspectorSectionDefinition = {
  id: 'image-content',
  render: ({ document, node, actions, focusedMode }) =>
    isImageNode(node) ? (
      <ImageContentSection
        document={document}
        node={node}
        onTextChange={actions.onTextChange}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

const imageStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions, focusedMode, globalStickyElevation }) =>
    isImageNode(node) ? <StickySection node={node} actions={actions} focusedMode={focusedMode} globalStickyElevation={globalStickyElevation} /> : null,
};

const imageAnimationSection: InspectorSectionDefinition = {
  id: 'animation',
  render: ({ node, actions, focusedMode }) =>
    isImageNode(node) ? <AnimationSection node={node} actions={actions} focusedMode={focusedMode} /> : null,
};

const imageDesignSection: InspectorSectionDefinition = {
  id: 'image-design',
  render: ({ node, actions, focusedMode }) =>
    isImageNode(node) ? (
      <ImageDesignSection
        node={node}
        onTextChange={actions.onTextChange}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
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
    id: 'sticky-behavior',
    bucket: 'behavior',
    title: 'Sticky behavior',
    description: 'Target, offsets, and duration behavior.',
    sections: [imageStickySection],
  }),
  createSectionBlock({
    id: 'animation-behavior',
    bucket: 'behavior',
    title: 'Animation',
    description: 'Motion effects and trigger configuration.',
    sections: [imageAnimationSection],
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
];

function isImageNode(node: InspectorNode | null): node is ImageInspectorNode {
  return Boolean(node && isMediaNode(node) && node.subtype === 'image');
}
