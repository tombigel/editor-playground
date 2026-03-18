import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument } from '../../model/defaults';
import { FocusedModePanel } from '../FocusedModePanel';
import { EditorSidebar } from '../EditorSidebar';

function createInspectorProps() {
  const document = createInitialDocument();
  const textNode = Object.values(document.nodes).find(
    (node) => node.type === 'leaf' && node.role === 'text',
  );
  const siteNode = document.nodes[document.rootId];

  if (!textNode || textNode.type !== 'leaf' || textNode.role !== 'text') {
    throw new Error('Expected text node');
  }

  const baseProps = {
    showOrderControls: false,
    canOrderBack: false,
    canOrderForward: false,
    canSendToBack: false,
    canBringToFront: false,
    orderBackShortcut: '',
    orderForwardShortcut: '',
    sendToBackShortcut: '',
    bringToFrontShortcut: '',
    canSectionBack: false,
    canSectionForward: false,
    onOrderBack: () => {},
    onOrderForward: () => {},
    onSendToBack: () => {},
    onBringToFront: () => {},
    onSectionBack: () => {},
    onSectionForward: () => {},
    onTextChange: () => {},
    onWrapperStyleChange: () => {},
    onRectChange: () => {},
    onPromote: () => {},
    onDemote: () => {},
    onStickyEnabled: () => {},
    onStickyTarget: () => {},
    onStickyEdges: () => {},
    onStickyOffset: () => {},
    onStickyOffsetTop: () => {},
    onStickyOffsetBottom: () => {},
    onStickyDurationMode: () => {},
    onStickyDuration: () => {},
    onStickyDurationTop: () => {},
    onStickyDurationBottom: () => {},
    onEnterFocusedMode: () => {},
  };

  return { textNode, siteNode, baseProps };
}

describe('panels/FocusedModePanel', () => {
  it('renders sticky-focused blocks for the selected node', () => {
    const { textNode, baseProps } = createInspectorProps();

    const markup = renderToStaticMarkup(
      <FocusedModePanel
        {...baseProps}
        node={textNode}
        focusedMode="sticky"
        mode="sticky"
        onExitFocusedMode={() => {}}
      />,
    );

    expect(markup).toContain('Sticky');
    expect(markup).toContain(textNode.name);
    expect(markup).toContain(textNode.role);
    expect(markup).toContain('Pin this node inside its structural range.');
    expect(markup).toContain('editor-scrollbar');
  });

  it('renders an empty state when sticky focused mode has no compatible selection', () => {
    const { siteNode, baseProps } = createInspectorProps();

    const markup = renderToStaticMarkup(
      <FocusedModePanel
        {...baseProps}
        node={siteNode}
        focusedMode="sticky"
        mode="sticky"
        onExitFocusedMode={() => {}}
      />,
    );

    expect(markup).toContain('Nothing to edit yet');
    expect(markup).toContain('Select a non-site node');
  });

  it('renders the temporary inspector independently from focused mode collapse state', () => {
    const { textNode, baseProps } = createInspectorProps();

    const markup = renderToStaticMarkup(
      <EditorSidebar
        {...baseProps}
        node={textNode}
        focusedMode={null}
        inspectorCollapsed={true}
        temporaryInspectorOpen={true}
        onInspectorCollapsedChange={() => {}}
        onTemporaryInspectorOpenChange={() => {}}
      />,
    );

    expect(markup).toContain(textNode.name);
    expect(markup).toContain('Collapse inspector');
    expect(markup).toContain('Pin this node inside its structural range.');
  });
});
