import { WrapperDesignSection } from './CommonSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, propertiesSection, summaryBlock } from './config.common';
import type { InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition, WrapperInspectorNode } from './types';

const wrapperDesignSection: InspectorSectionDefinition = {
  id: 'wrapper-design',
  render: ({ node, actions }) =>
    isWrapperNode(node) ? (
      <WrapperDesignSection node={node} onWrapperStyleChange={actions.onWrapperStyleChange} />
    ) : null,
};

const wrapperStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions, focusedMode }) =>
    isWrapperNode(node) ? <StickySection node={node} actions={actions} focusedMode={focusedMode} /> : null,
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
      id: 'design',
      bucket: 'primary',
      title: 'Design',
      description: 'Wrapper visual styling.',
      sections: [wrapperDesignSection],
    }),
    createSectionBlock({
      id: 'sticky-behavior',
      bucket: 'behavior',
      title,
      description: 'Target, offsets, and duration behavior.',
      sections: [wrapperStickySection],
    }),
    createSectionBlock({
      id: 'properties',
      bucket: 'primary',
      title: 'Properties',
      description: 'Component metadata.',
      sections: [propertiesSection],
    }),
  ];
}

function isWrapperNode(node: InspectorNode | null): node is WrapperInspectorNode {
  return Boolean(node && node.type === 'wrapper');
}
