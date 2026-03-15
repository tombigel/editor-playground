import { ButtonContentSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, summaryBlock } from './config.common';
import type { ButtonInspectorNode, InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition } from './types';

const buttonContentSection: InspectorSectionDefinition = {
  id: 'button-content',
  render: ({ node, actions }) =>
    isButtonNode(node) ? <ButtonContentSection node={node} onTextChange={actions.onTextChange} /> : null,
};

const buttonStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions }) =>
    isButtonNode(node) ? <StickySection node={node} actions={actions} /> : null,
};

export const BUTTON_INSPECTOR_CONFIG: readonly InspectorBlockDefinition[] = [
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
    description: 'Button label fields.',
    sections: [buttonContentSection],
  }),
  createSectionBlock({
    id: 'sticky-behavior',
    bucket: 'behavior',
    title: 'Sticky behavior',
    description: 'Target, offsets, and duration behavior.',
    sections: [buttonStickySection],
  }),
];

function isButtonNode(node: InspectorNode | null): node is ButtonInspectorNode {
  return Boolean(node && node.type === 'leaf' && node.role === 'button');
}
