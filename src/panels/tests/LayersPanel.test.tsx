import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument, createLeaf, createWrapper } from '../../model/defaults';
import type { DocumentModel } from '../../model/types';
import { LayersPanelContent } from '../LayersPanel';

const NO_OP = () => undefined;

function makeContentProps(document: DocumentModel, selectedIds: string[] = []) {
  return {
    document,
    activePageId: document.pages?.[0]?.id ?? null,
    selectedIds,
    onSelectNode: NO_OP,
    onRenameNode: NO_OP,
    onDeleteNode: NO_OP,
    onSetNodeVisibility: NO_OP,
    onSetTopLevelWrapperVisibility: NO_OP,
    onMoveNodeInTree: NO_OP,
  };
}

describe('panels/LayersPanel', () => {
  it('renders compact rows with a type line and explicit edit action', () => {
    const document = createInitialDocument();

    const markup = renderToStaticMarkup(
      <LayersPanelContent
        document={document}
        activePageId={document.pages?.[0]?.id ?? null}
        selectedIds={[]}
        onSelectNode={() => undefined}
        onRenameNode={() => undefined}
        onDeleteNode={() => undefined}
        onSetNodeVisibility={() => undefined}
        onSetTopLevelWrapperVisibility={() => undefined}
        onMoveNodeInTree={() => undefined}
      />,
    );

    expect(markup).toContain('editor-layers-row-type');
    expect(markup).toContain('editor-layers-divider');
    expect(markup).toContain('aria-label="Edit Playground Header"');
    expect(markup).toContain('editor-layers-action editor-layers-action-edit h-7 w-7');
    expect(markup).toContain('editor-layers-action editor-layers-action-visibility h-7 w-7');
    expect(markup).toContain('Visibility: All pages');
    expect(markup).toContain('Visibility: Current page');
    expect(markup).toContain('Edit title');
    expect(markup).toContain('Hide');
    expect(markup).not.toContain('aria-label="Delete Playground Header"');
    expect(markup.indexOf('aria-label="Edit Playground Header"')).toBeLessThan(
      markup.indexOf('aria-label="Visibility: All pages"'),
    );
    expect(markup).not.toContain('editor-pill-contrast');
  });

  it('shows empty state message when the document has no top-level nodes', () => {
    const document = createInitialDocument();
    const siteNode = document.nodes[document.rootId];
    if (!siteNode || siteNode.type !== 'site') throw new Error('Expected site node');

    const emptyDoc: DocumentModel = {
      ...document,
      nodes: {
        [document.rootId]: { ...siteNode, children: [] },
      },
    };

    const markup = renderToStaticMarkup(<LayersPanelContent {...makeContentProps(emptyDoc)} />);

    expect(markup).toContain('Nothing on stage yet.');
    expect(markup).not.toContain('editor-layers-row');
  });

  it('marks selected rows with aria-selected="true" and data-selected="true"', () => {
    const document = createInitialDocument();
    const header = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'header',
    );
    if (!header) throw new Error('Expected header node');

    const markup = renderToStaticMarkup(
      <LayersPanelContent {...makeContentProps(document, [header.id])} />,
    );

    expect(markup).toContain(`data-selected="true"`);
    expect(markup).toContain(`aria-selected="true"`);
  });

  it('marks hidden nodes with data-hidden="true"', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );
    if (!section || section.type !== 'wrapper') throw new Error('Expected section');

    const leaf = createLeaf('text', section.id);
    leaf.visible = false;
    document.nodes[leaf.id] = leaf;
    section.children.push(leaf.id);

    // section is expanded by default (it's a root wrapper), so leaf appears
    const markup = renderToStaticMarkup(<LayersPanelContent {...makeContentProps(document)} />);

    // The leaf row should have data-hidden="true"
    const hiddenRowRegex = new RegExp(
      `data-layers-row-id="${leaf.id}"[^>]*data-hidden="true"|data-hidden="true"[^>]*data-layers-row-id="${leaf.id}"`,
    );
    expect(hiddenRowRegex.test(markup)).toBe(true);
  });

  it('renders child rows nested inside expanded wrapper nodes', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );
    if (!section || section.type !== 'wrapper') throw new Error('Expected section');

    const leaf = createLeaf('button', section.id);
    leaf.name = 'My Button';
    document.nodes[leaf.id] = leaf;
    section.children.push(leaf.id);

    // section is expanded by default
    const markup = renderToStaticMarkup(<LayersPanelContent {...makeContentProps(document)} />);

    expect(markup).toContain('My Button');
    expect(markup).toContain(`data-layers-row-id="${leaf.id}"`);
  });

  it('applies deeper padding to child rows than their parent wrapper', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );
    if (!section || section.type !== 'wrapper') throw new Error('Expected section');

    const leaf = createLeaf('text', section.id);
    leaf.name = 'Deep Leaf';
    document.nodes[leaf.id] = leaf;
    section.children.push(leaf.id);

    const markup = renderToStaticMarkup(<LayersPanelContent {...makeContentProps(document)} />);

    // Root wrappers are at depth 0 → padding-left:8px
    // Leaf inside section is at depth 1 → padding-left:16px
    // Find the leaf row's opening tag and check its style attribute
    const leafRowStart = markup.indexOf(`data-layers-row-id="${leaf.id}"`);
    expect(leafRowStart).toBeGreaterThan(-1);

    // The style attribute is on the same element; grab the surrounding tag fragment
    const tagStart = markup.lastIndexOf('<div', leafRowStart);
    const tagEnd = markup.indexOf('>', leafRowStart);
    const rowTag = markup.slice(tagStart, tagEnd + 1);

    expect(rowTag).toContain('padding-left:16px');
  });

  it('renders a disclosure button for wrapper rows with children', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );
    if (!section || section.type !== 'wrapper') throw new Error('Expected section');

    const markup = renderToStaticMarkup(<LayersPanelContent {...makeContentProps(document)} />);

    // Section has children, so it should have a disclosure button
    expect(markup).toContain(`Collapse ${section.name}`);
    expect(markup).toContain('editor-layers-disclosure');
  });

  it('does not render a disclosure button for leaf rows', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );
    if (!section || section.type !== 'wrapper') throw new Error('Expected section');

    // Clear children then add a single leaf so we can identify it
    section.children = [];
    const leaf = createLeaf('image', section.id);
    leaf.name = 'Solo Image';
    document.nodes[leaf.id] = leaf;
    section.children.push(leaf.id);

    // section is expanded by default
    const markup = renderToStaticMarkup(<LayersPanelContent {...makeContentProps(document)} />);

    expect(markup).toContain('Solo Image');
    expect(markup).not.toContain(`Collapse Solo Image`);
    expect(markup).not.toContain(`Expand Solo Image`);
  });

  it('falls back to the typeLabel as displayName when the node name is blank', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );
    if (!section || section.type !== 'wrapper') throw new Error('Expected section');

    const leaf = createLeaf('link', section.id);
    leaf.name = '   '; // whitespace-only name
    document.nodes[leaf.id] = leaf;
    section.children.push(leaf.id);

    const markup = renderToStaticMarkup(<LayersPanelContent {...makeContentProps(document)} />);

    // Should use the typeLabel "Link" instead of the whitespace name
    expect(markup).toContain('aria-label="Edit Link"');
  });

  it('renders the Show button label for a hidden node', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );
    if (!section || section.type !== 'wrapper') throw new Error('Expected section');

    const leaf = createLeaf('text', section.id);
    leaf.name = 'Hidden Text';
    leaf.visible = false;
    document.nodes[leaf.id] = leaf;
    section.children.push(leaf.id);

    const markup = renderToStaticMarkup(<LayersPanelContent {...makeContentProps(document)} />);

    expect(markup).toContain('aria-label="Show Hidden Text"');
    expect(markup).toContain('Show');
  });

  it('renders a container wrapper nested inside a section', () => {
    const document = structuredClone(createInitialDocument());
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );
    if (!section || section.type !== 'wrapper') throw new Error('Expected section');

    const container = createWrapper('container', section.id);
    container.name = 'Card';
    document.nodes[container.id] = container;
    section.children.push(container.id);

    const markup = renderToStaticMarkup(<LayersPanelContent {...makeContentProps(document)} />);

    // Container row should appear as section is expanded by default
    expect(markup).toContain('Card');
    expect(markup).toContain(`data-layers-row-id="${container.id}"`);
    // Container is a wrapper with no children so no disclosure
    expect(markup).not.toContain('Expand Card');
  });
});
