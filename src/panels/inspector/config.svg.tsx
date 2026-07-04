import { AnimationSection } from './AnimationSection';
import { SvgContentSection, SvgDesignSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, summaryBlock } from './config.common';
import { isMediaNode } from '../../api/documentViewApi';
import type { InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition, SvgInspectorNode } from './types';

const svgContentSection: InspectorSectionDefinition = {
  id: 'svg-content',
  render: ({ node, actions, focusedMode }) =>
    isSvgNode(node) ? (
      <SvgContentSection
        node={node}
        onTextChange={actions.onTextChange}
        onSetSvgMarkup={actions.onSetSvgMarkup ?? (() => undefined)}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

const svgStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions, focusedMode, globalStickyElevation }) =>
    isSvgNode(node) ? <StickySection node={node} actions={actions} focusedMode={focusedMode} globalStickyElevation={globalStickyElevation} /> : null,
};

const svgAnimationSection: InspectorSectionDefinition = {
  id: 'animation',
  render: ({ node, actions, focusedMode }) =>
    isSvgNode(node) ? <AnimationSection node={node} actions={actions} focusedMode={focusedMode} /> : null,
};

const svgDesignSection: InspectorSectionDefinition = {
  id: 'svg-design',
  render: ({ node, actions, focusedMode }) =>
    isSvgNode(node) ? (
      <SvgDesignSection
        node={node}
        onTextChange={actions.onTextChange}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

export const SVG_INSPECTOR_CONFIG: readonly InspectorBlockDefinition[] = [
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
    sections: [svgStickySection],
  }),
  createSectionBlock({
    id: 'animation-behavior',
    bucket: 'behavior',
    title: 'Animation',
    description: 'Motion effects and trigger configuration.',
    sections: [svgAnimationSection],
  }),
  createSectionBlock({
    id: 'content',
    bucket: 'primary',
    title: 'Content',
    description: 'SVG markup, accessibility, and viewBox.',
    sections: [svgContentSection],
  }),
  createSectionBlock({
    id: 'design',
    bucket: 'primary',
    title: 'Design',
    description: 'Fit, color, stroke, and shadow styling.',
    sections: [svgDesignSection],
  }),
];

function isSvgNode(node: InspectorNode | null): node is SvgInspectorNode {
  return Boolean(node && isMediaNode(node) && node.subtype === 'svg');
}
