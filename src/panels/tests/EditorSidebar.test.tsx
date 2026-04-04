import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument } from '../../model/defaults';
import { EditorSidebar, resolveSidebarTitleCommit } from '../EditorSidebar';

function createSidebarProps() {
  const document = createInitialDocument();
  const sectionNode = Object.values(document.nodes).find(
    (node) => node.type === 'wrapper' && node.role === 'section',
  );

  if (!sectionNode || sectionNode.type !== 'wrapper') {
    throw new Error('Expected section node');
  }

  return {
    document,
    node: sectionNode,
    selectedNodes: [sectionNode] as typeof document.nodes[string][],
    focusedMode: null,
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
    globalStickyElevation: true,
    onStickyElevation: () => undefined,
    onStickyElevated: () => undefined,
    inspectorCollapsed: false,
    temporaryInspectorOpen: false,
    onInspectorCollapsedChange: () => {},
    onTemporaryInspectorOpenChange: () => {},
  } as const;
}

describe('panels/EditorSidebar', () => {
  it('falls back to the component type when the edited title is left empty', () => {
    expect(resolveSidebarTitleCommit('', 'section')).toBe('section');
    expect(resolveSidebarTitleCommit('   ', 'section')).toBe('section');
    expect(resolveSidebarTitleCommit('  Hero  ', 'section')).toBe('Hero');
  });

  it('renders the component type under the editable title with a tighter gap and hover edit affordance', () => {
    const markup = renderToStaticMarkup(<EditorSidebar {...createSidebarProps()} />);

    expect(markup).toContain('aria-label="Edit title"');
    expect(markup).toContain('text-left');
    expect(markup).toContain('editor-pill-contrast inline-flex');
    expect(markup).toContain('group-hover:opacity-100');
  });

  it('renders a stronger current-page editor when nothing is selected', () => {
    const props = createSidebarProps();
    const pageId = props.document.pages?.[0]?.id;

    if (!pageId) {
      throw new Error('Expected initial page');
    }

    const markup = renderToStaticMarkup(
      <EditorSidebar
        {...props}
        node={null}
        selectedNodes={[]}
        activePageId={pageId}
        onSetPageDisplayName={() => {}}
        onSetPageSlug={() => {}}
        onSetPageVisibility={() => {}}
        onSetPageViewTransition={() => {}}
        onOpenPageSettings={() => {}}
        onOpenPagesPanel={() => {}}
      />,
    );

    expect(markup).toContain('Page settings');
    expect(markup).toContain('All pages');
    expect(markup).toContain('aria-label="Open page settings"');
    expect(markup).toContain('Inherit from site');
    expect(markup).toContain('overflow-y-auto pt-3');
    expect(markup).not.toContain('aria-label="Manage page settings"');
  });
});
