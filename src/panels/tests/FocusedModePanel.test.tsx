import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument, createLeaf } from '../../model/defaults';
import { FocusedModePanel } from '../FocusedModePanel';
import { EditorSidebar } from '../EditorSidebar';

function createInspectorProps() {
  const document = createInitialDocument();
  const textNode = Object.values(document.nodes).find(
    (node) => node.type === 'leaf' && node.role === 'text',
  );
  const linkNode = Object.values(document.nodes).find(
    (node) => node.type === 'leaf' && node.role === 'link',
  );
  const sectionNode = Object.values(document.nodes).find(
    (node) => node.type === 'wrapper' && node.role === 'section',
  );
  const siteNode = document.nodes[document.rootId];

  if (!textNode || textNode.type !== 'leaf' || textNode.role !== 'text') {
    throw new Error('Expected text node');
  }
  if (!linkNode || linkNode.type !== 'leaf' || linkNode.role !== 'link') {
    throw new Error('Expected link node');
  }
  if (!sectionNode || sectionNode.type !== 'wrapper') {
    throw new Error('Expected section node');
  }

  const buttonNode = createLeaf('button', sectionNode.id);
  document.nodes[buttonNode.id] = buttonNode;
  sectionNode.children.push(buttonNode.id);

  const baseProps = {
    selectedNodes: [textNode],
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
    onOpenManageFonts: () => {},
    globalStickyElevation: true,
    onStickyElevation: () => undefined,
    onStickyElevated: () => undefined,
  };

  return { document, textNode, linkNode, buttonNode, siteNode, baseProps };
}

describe('panels/FocusedModePanel', () => {
  it('renders sticky-focused blocks for the selected node', () => {
    const { document, textNode, baseProps } = createInspectorProps();

    const markup = renderToStaticMarkup(
      <FocusedModePanel
        {...baseProps}
        document={document}
        node={textNode}
        focusedMode="sticky"
        mode="sticky"
        onExitFocusedMode={() => {}}
        onHeaderDragPointerDown={() => {}}
      />,
    );

    expect(markup).toContain('Sticky');
    expect(markup).toContain(textNode.name);
    expect(markup).toContain(textNode.role);
    expect(markup).toContain('Pin this node inside its structural range.');
    expect(markup).toContain('editor-focused-panel');
    expect(markup).toContain('aria-label="Drag focused panel"');
  });

  it('renders layout-focused controls for the selected node', () => {
    const { document, textNode, baseProps } = createInspectorProps();

    const markup = renderToStaticMarkup(
      <FocusedModePanel
        {...baseProps}
        document={document}
        node={textNode}
        focusedMode="layout"
        mode="layout"
        onExitFocusedMode={() => {}}
      />,
    );

    expect(markup).toContain('Layout');
    expect(markup).toContain(textNode.name);
    expect(markup).toContain('>W<');
    expect(markup).toContain('>H<');
    expect(markup).toContain('aria-label="Close layout focus mode"');
    expect(markup).not.toContain('Pin this node inside its structural range.');
  });

  it('renders combined design-focused controls for text nodes', () => {
    const { document, textNode, baseProps } = createInspectorProps();

    const markup = renderToStaticMarkup(
      <FocusedModePanel
        {...baseProps}
        document={document}
        node={textNode}
        focusedMode="design"
        mode="design"
        onExitFocusedMode={() => {}}
      />,
    );

    expect(markup).toContain('Design');
    expect(markup).toContain(textNode.name);
    expect(markup).toContain('aria-label="Manage fonts"');
    expect(markup).toContain('>HTML tag<');
    expect(markup).toContain('>Color<');
    expect(markup).toContain('>Shadow<');
    expect(markup).toContain('editor-border-subtle space-y-2.5 border-t pt-2.5');
    expect(markup).toContain('aria-label="Close design focus mode"');
  });

  it('renders content-focused controls for text nodes', () => {
    const { document, textNode, baseProps } = createInspectorProps();

    const markup = renderToStaticMarkup(
      <FocusedModePanel
        {...baseProps}
        document={document}
        node={textNode}
        focusedMode="content"
        mode="content"
        onExitFocusedMode={() => {}}
      />,
    );

    expect(markup).toContain('Content');
    expect(markup).toContain(textNode.name);
    expect(markup).toContain('>Text<');
    expect(markup).toContain('aria-label="Close content focus mode"');
    expect(markup).not.toContain('>HTML tag<');
  });

  it('renders content-focused navigation controls for button nodes', () => {
    const { document, buttonNode, baseProps } = createInspectorProps();

    const markup = renderToStaticMarkup(
      <FocusedModePanel
        {...baseProps}
        document={document}
        node={buttonNode}
        focusedMode="content"
        mode="content"
        onExitFocusedMode={() => {}}
      />,
    );

    expect(markup).toContain('Content');
    expect(markup).toContain(buttonNode.name);
    expect(markup).toContain('>Type<');
    expect(markup).toContain('>Internal<');
    expect(markup).toContain('>External<');
    expect(markup).toContain('>Href<');
    expect(markup).toContain('Open in a new tab');
    expect(markup).toContain('space-y-2.5 px-3 pt-1.5 pb-5');
  });

  it('renders sticky-focused controls for multiple selected nodes', () => {
    const { document, textNode, baseProps } = createInspectorProps();
    const secondTextNode = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'text' && node.id !== textNode.id,
    );

    if (!secondTextNode || secondTextNode.type !== 'leaf' || secondTextNode.role !== 'text') {
      throw new Error('Expected second text node');
    }

    const markup = renderToStaticMarkup(
      <FocusedModePanel
        {...baseProps}
        document={document}
        node={textNode}
        selectedNodes={[textNode, secondTextNode]}
        focusedMode="sticky"
        mode="sticky"
        onExitFocusedMode={() => {}}
      />,
    );

    expect(markup).toContain('Sticky');
    expect(markup).toContain('2 selected');
    expect(markup).toContain('Pin selected nodes inside their structural range.');
  });

  it('renders an empty state when sticky focused mode has no compatible selection', () => {
    const { document, siteNode, baseProps } = createInspectorProps();

    const markup = renderToStaticMarkup(
      <FocusedModePanel
        {...baseProps}
        document={document}
        node={siteNode}
        focusedMode="sticky"
        mode="sticky"
        onExitFocusedMode={() => {}}
      />,
    );

    expect(markup).toContain('Nothing to edit yet');
    expect(markup).toContain('editor-text-strong text-sm font-medium');
    expect(markup).toContain(siteNode.name);
    expect(markup).toContain('site');
    expect(markup).toContain('editor-text-strong text-xs font-medium');
    expect(markup).toContain('Select a non-site node');
    expect(markup).toContain('aria-label="Close sticky focus mode"');
  });

  it('renders the temporary inspector independently from focused mode collapse state', () => {
    const { document, textNode, baseProps } = createInspectorProps();

    const markup = renderToStaticMarkup(
      <EditorSidebar
        {...baseProps}
        document={document}
        node={textNode}
        focusedMode={null}
        inspectorCollapsed={true}
        temporaryInspectorOpen={true}
        onInspectorCollapsedChange={() => {}}
        onTemporaryInspectorOpenChange={() => {}}
      />,
    );

    expect(markup).toContain(textNode.name);
    expect(markup).toContain('aria-label="Edit title"');
    expect(markup).toContain('Collapse inspector');
    expect(markup).toContain('Pin this node inside its structural range.');
  });

  it('renders broken-anchor warnings in focused mode headers for selected links', () => {
    const { document, linkNode, baseProps } = createInspectorProps();
    linkNode.linkType = 'anchor';
    linkNode.anchorTargetId = 'missing-section';

    const markup = renderToStaticMarkup(
      <FocusedModePanel
        {...baseProps}
        document={document}
        node={linkNode}
        selectedNodes={[linkNode]}
        focusedMode="content"
        mode="content"
        onExitFocusedMode={() => {}}
      />,
    );

    expect(markup).toContain('Broken anchor');
    expect(markup).toContain('>Section<');
  });
});
