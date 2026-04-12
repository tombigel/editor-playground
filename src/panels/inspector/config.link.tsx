import { AnimationSection } from './AnimationSection';
import { LinkAppearanceSection, LinkContentSection, LinkDesignSection, LinkTextStyleSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, summaryBlock } from './config.common';
import { isTextNode } from '../../api/documentViewApi';
import type { InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition, LinkInspectorNode } from './types';

const linkContentSection: InspectorSectionDefinition = {
  id: 'link-content',
  render: ({ document, node, actions, focusedMode }) =>
    isLinkNode(node) ? (
      <LinkContentSection
        document={document}
        node={node}
        onTextChange={actions.onTextChange}
        onSetTextDocumentContent={(content) => actions.onSetTextDocumentContent?.(node.id, content)}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

const linkStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions, focusedMode, globalStickyElevation }) =>
    isLinkNode(node) ? <StickySection node={node} actions={actions} focusedMode={focusedMode} globalStickyElevation={globalStickyElevation} /> : null,
};

const linkAnimationSection: InspectorSectionDefinition = {
  id: 'animation',
  render: ({ node, actions, focusedMode }) =>
    isLinkNode(node) ? <AnimationSection node={node} actions={actions} focusedMode={focusedMode} /> : null,
};

const linkDesignSection: InspectorSectionDefinition = {
  id: 'link-design',
  render: ({ node, actions, focusedMode }) =>
    isLinkNode(node) ? (
      <LinkDesignSection
        node={node}
        onTextChange={actions.onTextChange}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

const linkTextStyleSection: InspectorSectionDefinition = {
  id: 'link-text-style',
  render: ({ document, node, actions, focusedMode }) =>
    isLinkNode(node) ? (
      <LinkTextStyleSection
        document={document}
        node={node}
        onTextChange={actions.onTextChange}
        onOpenManageFonts={actions.onOpenManageFonts ?? (() => undefined)}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

export const linkAppearanceSection: InspectorSectionDefinition = {
  id: 'link-appearance',
  render: ({ document, node, actions, focusedMode }) =>
    isLinkNode(node) ? (
      <LinkAppearanceSection
        document={document}
        node={node}
        onTextChange={actions.onTextChange}
        onOpenManageFonts={actions.onOpenManageFonts ?? (() => undefined)}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
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
    id: 'sticky-behavior',
    bucket: 'behavior',
    title: 'Sticky behavior',
    description: 'Target, offsets, and duration behavior.',
    sections: [linkStickySection],
  }),
  createSectionBlock({
    id: 'animation-behavior',
    bucket: 'behavior',
    title: 'Animation',
    description: 'Motion effects and trigger configuration.',
    sections: [linkAnimationSection],
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
];

function isLinkNode(node: InspectorNode | null): node is LinkInspectorNode {
  return Boolean(node && isTextNode(node) && node.link !== undefined);
}
