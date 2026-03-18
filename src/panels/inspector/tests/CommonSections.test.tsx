import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createInitialDocument, createWrapper } from '../../../model/defaults';
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
    if (!button?.props.onClick) {
      throw new Error('Expected focused-mode entry button');
    }

    button.props.onClick();
    expect(onEnter).toHaveBeenCalledWith('sticky');
  });

  it('shows the top-level width field as disabled when the wrapper is locked to 100%', () => {
    const document = createInitialDocument();
    const headerNode = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'header',
    );

    if (!headerNode || headerNode.type !== 'wrapper') {
      throw new Error('Expected header wrapper');
    }

    const markup = renderToStaticMarkup(
      <NodeBasicsSection
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
        }}
      />,
    );

    expect(markup).toContain('>W<');
    expect(markup).toContain('value="100"');
    expect(markup).toContain('disabled=""');
    expect(markup).not.toContain('>X<');
    expect(markup).not.toContain('>Y<');
    expect(markup).toContain('>Padding<');
    expect(markup).toContain('aria-label="Top padding"');
    expect(markup).toContain('aria-label="Right padding"');
    expect(markup).toContain('aria-label="Bottom padding"');
    expect(markup).toContain('aria-label="Left padding"');
    expect(markup).toContain('value="20"');
    expect(markup).toContain('value="48"');
  });

  it('shows the same padding control surface for container wrappers', () => {
    const containerNode = createWrapper('container', 'root');

    const markup = renderToStaticMarkup(
      <NodeBasicsSection
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
        }}
      />,
    );

    expect(markup).toContain('>X<');
    expect(markup).toContain('>Y<');
    expect(markup).toContain('>Padding<');
    expect(markup).toContain('aria-label="Top padding"');
    expect(markup).toContain('aria-label="Right padding"');
    expect(markup).toContain('aria-label="Bottom padding"');
    expect(markup).toContain('aria-label="Left padding"');
    expect(markup).toContain('value="16"');
  });

  it('renders custom header content and action without affecting the shared card structure', () => {
    const onClick = vi.fn();
    const markup = renderToStaticMarkup(
      <InspectorSectionCard
        title="Sticky"
        headerContent={<div>Post Title</div>}
        headerAction={{
          ariaLabel: 'Close sticky mode',
          icon: <span>close</span>,
          onClick,
        }}
      >
        <div>Body</div>
      </InspectorSectionCard>,
    );

    expect(markup).toContain('Post Title');
    expect(markup).toContain('aria-label="Close sticky mode"');
    expect(markup).toContain('Body');
  });

  it('renders an editable title button in the summary for non-site nodes', () => {
    const document = createInitialDocument();
    const headerNode = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'header',
    );

    if (!headerNode || headerNode.type !== 'wrapper') {
      throw new Error('Expected header wrapper');
    }

    const markup = renderToStaticMarkup(
      <InspectorSummary
        document={document}
        node={headerNode}
        actions={{ onTextChange: () => {} }}
      />,
    );

    expect(markup).toContain('aria-label="Edit title"');
    expect(markup).toContain('Playground Header');
    expect(markup).toContain('>header<');
  });

  it('renders the site summary title without the editable button affordance', () => {
    const document = createInitialDocument();
    const siteNode = document.nodes[document.rootId];

    const markup = renderToStaticMarkup(
      <InspectorSummary
        document={document}
        node={siteNode}
        actions={{ onTextChange: () => {} }}
      />,
    );

    expect(markup).toContain('Site');
    expect(markup).not.toContain('aria-label="Edit title"');
  });
});

function findElementByAriaLabel(node: ReactNode, ariaLabel: string): ReactElement | null {
  if (!isValidElement(node)) {
    return null;
  }

  if (node.props['aria-label'] === ariaLabel) {
    return node;
  }

  return findInChildren(node.props.children, ariaLabel);
}

function findInChildren(children: ReactNode, ariaLabel: string): ReactElement | null {
  const childList = Array.isArray(children) ? children : [children];

  for (const child of childList) {
    const match = findElementByAriaLabel(child, ariaLabel);
    if (match) {
      return match;
    }
  }

  return null;
}
