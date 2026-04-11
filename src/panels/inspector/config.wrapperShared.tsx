import { AnimationSection } from './AnimationSection';
import { WrapperDesignSection } from './CommonSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, summaryBlock } from './config.common';
import type { InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition, WrapperInspectorNode } from './types';

const wrapperDesignSection: InspectorSectionDefinition = {
  id: 'wrapper-design',
  render: ({ node, actions, focusedMode }) =>
    isWrapperNode(node) ? (
      <WrapperDesignSection
        node={node}
        onWrapperStyleChange={actions.onWrapperStyleChange}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

const wrapperStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions, focusedMode, globalStickyElevation }) =>
    isWrapperNode(node) ? <StickySection node={node} actions={actions} focusedMode={focusedMode} globalStickyElevation={globalStickyElevation} /> : null,
};

const wrapperAnimationSection: InspectorSectionDefinition = {
  id: 'animation',
  render: ({ node, actions, focusedMode }) =>
    isWrapperNode(node) ? <AnimationSection node={node} actions={actions} focusedMode={focusedMode} /> : null,
};

export function createWrapperInspectorConfig(title = 'Sticky behavior'): readonly InspectorBlockDefinition[] {
  return [
    summaryBlock,
    createSectionBlock({
      id: 'layout',
      bucket: 'primary',
      title: 'Layout',
      description: 'Position, sizing, and wrapper actions.',
      sections: [basicsSection],
    }),
    createSectionBlock({
      id: 'sticky-behavior',
      bucket: 'behavior',
      title,
      description: 'Target, offsets, and duration behavior.',
      sections: [wrapperStickySection],
    }),
    createSectionBlock({
      id: 'animation-behavior',
      bucket: 'behavior',
      title: 'Animation',
      description: 'Motion effects and trigger configuration.',
      sections: [wrapperAnimationSection],
    }),
    createSectionBlock({
      id: 'design',
      bucket: 'primary',
      title: 'Design',
      description: 'Wrapper visual styling.',
      sections: [wrapperDesignSection],
    }),
  ];
}

function isWrapperNode(node: InspectorNode | null): node is WrapperInspectorNode {
  return Boolean(node && node.contentType === 'container');
}
