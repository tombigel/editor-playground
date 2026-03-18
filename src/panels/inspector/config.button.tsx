import { ButtonContentSection, ButtonDesignSection, ButtonTextStyleSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, propertiesSection, summaryBlock } from './config.common';
import type { ButtonInspectorNode, InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition } from './types';

const buttonContentSection: InspectorSectionDefinition = {
  id: 'button-content',
  render: ({ node, actions }) =>
    isButtonNode(node) ? <ButtonContentSection node={node} onTextChange={actions.onTextChange} /> : null,
};

const buttonStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions, focusedMode }) =>
    isButtonNode(node) ? <StickySection node={node} actions={actions} focusedMode={focusedMode} /> : null,
};

const buttonDesignSection: InspectorSectionDefinition = {
  id: 'button-design',
  render: ({ node, actions }) =>
    isButtonNode(node) ? <ButtonDesignSection node={node} onTextChange={actions.onTextChange} /> : null,
};

const buttonTextStyleSection: InspectorSectionDefinition = {
  id: 'button-text-style',
  render: ({ document, node, actions }) =>
    isButtonNode(node) ? (
      <ButtonTextStyleSection
        document={document}
        node={node}
        onTextChange={actions.onTextChange}
        onOpenManageFonts={actions.onOpenManageFonts ?? (() => undefined)}
      />
    ) : null,
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
    id: 'text-style',
    bucket: 'primary',
    title: 'Text style',
    description: 'Typography and wrapping controls.',
    sections: [buttonTextStyleSection],
  }),
  createSectionBlock({
    id: 'design',
    bucket: 'primary',
    title: 'Design',
    description: 'Colors, fill, padding, border, and shadow.',
    sections: [buttonDesignSection],
  }),
  createSectionBlock({
    id: 'sticky-behavior',
    bucket: 'behavior',
    title: 'Sticky behavior',
    description: 'Target, offsets, and duration behavior.',
    sections: [buttonStickySection],
  }),
  createSectionBlock({
    id: 'properties',
    bucket: 'primary',
    title: 'Properties',
    description: 'Component metadata.',
    sections: [propertiesSection],
  }),
];

function isButtonNode(node: InspectorNode | null): node is ButtonInspectorNode {
  return Boolean(node && node.type === 'leaf' && node.role === 'button');
}
