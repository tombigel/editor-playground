import { AnimationSection } from './AnimationSection';
import { ButtonAppearanceSection, ButtonContentSection, ButtonDesignSection, ButtonTextStyleSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, summaryBlock } from './config.common';
import { isTextNode } from '../../api/documentViewApi';
import type { ButtonInspectorNode, InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition } from './types';

const buttonContentSection: InspectorSectionDefinition = {
  id: 'button-content',
  render: ({ document, node, actions, focusedMode }) =>
    isButtonNode(node) ? (
      <ButtonContentSection
        document={document}
        node={node}
        onTextChange={actions.onTextChange}
        onSetTextDocumentContent={(content) => actions.onSetTextDocumentContent?.(node.id, content)}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

const buttonStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions, focusedMode, globalStickyElevation }) =>
    isButtonNode(node) ? <StickySection node={node} actions={actions} focusedMode={focusedMode} globalStickyElevation={globalStickyElevation} /> : null,
};

const buttonAnimationSection: InspectorSectionDefinition = {
  id: 'animation',
  render: ({ node, actions, focusedMode }) =>
    isButtonNode(node) ? <AnimationSection node={node} actions={actions} focusedMode={focusedMode} /> : null,
};

const buttonDesignSection: InspectorSectionDefinition = {
  id: 'button-design',
  render: ({ node, actions, focusedMode }) =>
    isButtonNode(node) ? (
      <ButtonDesignSection
        node={node}
        onTextChange={actions.onTextChange}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

const buttonTextStyleSection: InspectorSectionDefinition = {
  id: 'button-text-style',
  render: ({ document, node, actions, focusedMode }) =>
    isButtonNode(node) ? (
      <ButtonTextStyleSection
        document={document}
        node={node}
        onTextChange={actions.onTextChange}
        onOpenManageFonts={actions.onOpenManageFonts ?? (() => undefined)}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

export const buttonAppearanceSection: InspectorSectionDefinition = {
  id: 'button-appearance',
  render: ({ document, node, actions, focusedMode }) =>
    isButtonNode(node) ? (
      <ButtonAppearanceSection
        document={document}
        node={node}
        onTextChange={actions.onTextChange}
        onOpenManageFonts={actions.onOpenManageFonts ?? (() => undefined)}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
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
    id: 'sticky-behavior',
    bucket: 'behavior',
    title: 'Sticky behavior',
    description: 'Target, offsets, and duration behavior.',
    sections: [buttonStickySection],
  }),
  createSectionBlock({
    id: 'animation-behavior',
    bucket: 'behavior',
    title: 'Animation',
    description: 'Motion effects and trigger configuration.',
    sections: [buttonAnimationSection],
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
];

function isButtonNode(node: InspectorNode | null): node is ButtonInspectorNode {
  return Boolean(node && isTextNode(node) && node.link !== undefined && node.style?.background !== undefined);
}
