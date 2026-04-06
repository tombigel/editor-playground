import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createInitialDocument, createTextNode, createContainerNode } from '../../../model/defaults';
import { InspectorSectionCard, InspectorSummary, NodeBasicsSection } from '../CommonSections';

describe('panels/inspector/CommonSections', () => {
  it('invokes the focused-mode entry action from the section header button', () => {
    const onEnter = vi.fn();
    const tree = InspectorSectionCard({
      title: 'Sticky',
      focusedModeEntry: {
        mode: 'sticky',
        label: 'Sticky focus mode',
        tooltip: 'Sticky focus mode',
        ariaLabel: 'Go to Sticky focus mode',
        onEnter,
      },
      children: null,
    });

    const button = findElementByAriaLabel(tree, 'Go to Sticky focus mode');
    if (typeof button?.props.onClick !== 'function') {
      throw new Error('Expected focused-mode entry button');
    }

    (button.props.onClick as () => void)();
    expect(onEnter).toHaveBeenCalledWith('sticky');
  });

  it('shows the top-level width field as disabled when the wrapper is locked to 100%', () => {
    const document = createInitialDocument();
    const headerNode = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'header',
    );

    if (!headerNode || headerNode.contentType !== 'container') {
      throw new Error('Expected header wrapper');
    }

    const markup = renderToStaticMarkup(
      <NodeBasicsSection
        document={document}
        activePageId={document.pages?.[0]?.id ?? null}
        node={headerNode}
        orderState={{
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
        }}
        actions={{
          onRectChange: () => {},
          onPromote: () => {},
          onDemote: () => {},
          onWrapperStyleChange: () => {},
          onSetNodeVisibility: () => {},
          onSetTopLevelWrapperVisibility: () => {},
        }}
      />,
    );

    expect(markup).toContain('>W<');
    expect(markup).toContain('value="100"');
    expect(markup).toContain('disabled=""');
    expect(markup).not.toContain('>X<');
    expect(markup).not.toContain('>Y<');
    expect(markup).toContain('>Padding<');
    expect(markup).toContain('value="20"');
    expect(markup).toContain('value="48"');
  });

  it('shows the same padding control surface for container wrappers', () => {
    const document = createInitialDocument();
    const containerNode = createContainerNode('container', 'root');

    const markup = renderToStaticMarkup(
      <NodeBasicsSection
        document={document}
        activePageId={document.pages?.[0]?.id ?? null}
        node={containerNode}
        orderState={{
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
        }}
        actions={{
          onRectChange: () => {},
          onPromote: () => {},
          onDemote: () => {},
          onWrapperStyleChange: () => {},
          onSetNodeVisibility: () => {},
          onSetTopLevelWrapperVisibility: () => {},
        }}
      />,
    );

    expect(markup).toContain('>X<');
    expect(markup).toContain('>Y<');
    expect(markup).toContain('>Padding<');
    expect(markup).toContain('value="16"');
  });

  it('renders a top-level wrapper visibility control for eligible wrappers', () => {
    const document = createInitialDocument();
    const sectionNode = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );

    if (!sectionNode || sectionNode.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const markup = renderToStaticMarkup(
      <NodeBasicsSection
        document={document}
        activePageId={document.pages?.[0]?.id ?? null}
        node={sectionNode}
        orderState={{
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
        }}
        actions={{
          onRectChange: () => {},
          onPromote: () => {},
          onDemote: () => {},
          onWrapperStyleChange: () => {},
          onSetNodeVisibility: () => {},
          onSetTopLevelWrapperVisibility: () => {},
        }}
      />,
    );

    expect(markup).toContain('Visibility: Current page');
    expect(markup).toContain('Choose where this top-level component appears.');
  });

  it('renders a visible/hidden switch for non-top-level nodes', () => {
    const document = createInitialDocument();
    const sectionNode = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'section',
    );
    if (!sectionNode || sectionNode.contentType !== 'container') {
      throw new Error('Expected section wrapper');
    }

    const textNode = createTextNode('block', sectionNode.id);
    textNode.name = 'Hero Copy';

    const markup = renderToStaticMarkup(
      <NodeBasicsSection
        document={document}
        activePageId={document.pages?.[0]?.id ?? null}
        node={textNode}
        orderState={{
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
        }}
        actions={{
          onRectChange: () => {},
          onPromote: () => {},
          onDemote: () => {},
          onWrapperStyleChange: () => {},
          onSetNodeVisibility: () => {},
          onSetTopLevelWrapperVisibility: () => {},
        }}
      />,
    );

    expect(markup).toContain('Visibility');
    expect(markup).toContain('data-ui="switch"');
    expect(markup).toContain('aria-label="Hide Hero Copy"');
  });

  it('renders custom header content and action without affecting the shared card structure', () => {
    const onClick = vi.fn();
    const tree = InspectorSectionCard({
      title: 'Sticky',
      headerContent: <div>Post Title</div>,
      headerAction: {
        ariaLabel: 'Close sticky mode',
        icon: <span>close</span>,
        onClick,
      },
      children: <div>Body</div>,
    });

    const markup = renderToStaticMarkup(tree as ReactElement);

    expect(markup).toContain('Post Title');
    expect(markup).toContain('aria-label="Close sticky mode"');
    expect(markup).toContain('Body');

    const button = findElementByAriaLabel(tree, 'Close sticky mode');
    if (typeof button?.props.onClick !== 'function') {
      throw new Error('Expected header action button with onClick');
    }

    (button.props.onClick as () => void)();
    expect(onClick).toHaveBeenCalled();
  });

  it('renders the summary title itself as the editable surface for non-site nodes', () => {
    const document = createInitialDocument();
    const headerNode = Object.values(document.nodes).find(
      (node) => node.contentType === 'container' && node.subtype === 'header',
    );

    if (!headerNode || headerNode.contentType !== 'container') {
      throw new Error('Expected header wrapper');
    }

    const markup = renderToStaticMarkup(
      <InspectorSummary
        node={headerNode}
        actions={{ onTextChange: () => {} }}
      />,
    );

    expect(markup).toContain('aria-label="Edit title"');
    expect(markup).toContain('<button');
    expect(markup).toContain('Playground Header');
    expect(markup).toContain('>header<');
    expect(markup).toContain('data-ui="value-pill"');
  });

  it('renders the site summary title without the editable button affordance', () => {
    const document = createInitialDocument();
    const siteNode = document.nodes[document.rootId];

    const markup = renderToStaticMarkup(
      <InspectorSummary
        node={siteNode}
        actions={{ onTextChange: () => {} }}
      />,
    );

    expect(markup).toContain('Site');
    expect(markup).not.toContain('aria-label="Edit title"');
  });
});

function findElementByAriaLabel(node: ReactNode, ariaLabel: string): ReactElement<Record<string, unknown>> | null {
  if (!isValidElement(node)) {
    return null;
  }

  const el = node as ReactElement<Record<string, unknown>>;

  if (el.props['aria-label'] === ariaLabel) {
    return el;
  }

  return findInChildren(el.props.children as ReactNode, ariaLabel);
}

function findInChildren(children: ReactNode, ariaLabel: string): ReactElement<Record<string, unknown>> | null {
  const childList = Array.isArray(children) ? children : [children];

  for (const child of childList) {
    const match = findElementByAriaLabel(child, ariaLabel);
    if (match) {
      return match;
    }
  }

  return null;
}
