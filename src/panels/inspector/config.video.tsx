import { AnimationSection } from './AnimationSection';
import { VideoContentSection, VideoDesignSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, summaryBlock } from './config.common';
import { isMediaNode } from '../../api/documentViewApi';
import type { InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition, VideoInspectorNode } from './types';

const videoContentSection: InspectorSectionDefinition = {
  id: 'video-content',
  render: ({ node, actions, focusedMode }) =>
    isVideoNode(node) ? (
      <VideoContentSection
        node={node}
        onTextChange={actions.onTextChange}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

const videoStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions, focusedMode, globalStickyElevation }) =>
    isVideoNode(node) ? <StickySection node={node} actions={actions} focusedMode={focusedMode} globalStickyElevation={globalStickyElevation} /> : null,
};

const videoAnimationSection: InspectorSectionDefinition = {
  id: 'animation',
  render: ({ node, actions, focusedMode }) =>
    isVideoNode(node) ? <AnimationSection node={node} actions={actions} focusedMode={focusedMode} /> : null,
};

const videoDesignSection: InspectorSectionDefinition = {
  id: 'video-design',
  render: ({ node, actions, focusedMode }) =>
    isVideoNode(node) ? (
      <VideoDesignSection
        node={node}
        onTextChange={actions.onTextChange}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

export const VIDEO_INSPECTOR_CONFIG: readonly InspectorBlockDefinition[] = [
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
    sections: [videoStickySection],
  }),
  createSectionBlock({
    id: 'animation-behavior',
    bucket: 'behavior',
    title: 'Animation',
    description: 'Motion effects and trigger configuration.',
    sections: [videoAnimationSection],
  }),
  createSectionBlock({
    id: 'content',
    bucket: 'primary',
    title: 'Content',
    description: 'Video source, poster, and playback options.',
    sections: [videoContentSection],
  }),
  createSectionBlock({
    id: 'design',
    bucket: 'primary',
    title: 'Design',
    description: 'Fit, border, radius, and shadow styling.',
    sections: [videoDesignSection],
  }),
];

function isVideoNode(node: InspectorNode | null): node is VideoInspectorNode {
  return Boolean(node && isMediaNode(node) && node.subtype === 'video');
}
