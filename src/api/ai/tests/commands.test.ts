import { describe, expect, it } from 'vitest';
import { createInitialDocument, createContainerNode, createMediaNode, createTextNode } from '../../../model/defaults';
import { createTextDocumentFromText } from '../../../model/richContent';
import type { DocumentModel, NodeId } from '../../../model/types';
import { isContainerNode, isTextNode } from '../../../model/types';
import { AiCommandBatchRejectedError, applyAiDocumentCommands } from '../commands';

type Fixture = {
  document: DocumentModel;
  siteId: NodeId;
  sectionId: NodeId;
  siblingSectionId: NodeId;
  textId: NodeId;
  mediaId: NodeId;
  innerContainerId: NodeId;
};

/**
 * Builds a fixture with a site root, two sibling sections, a text node, a
 * media node, and a nested container — enough surface to exercise every
 * command variant's happy path.
 */
function createFixture(): Fixture {
  const document = createInitialDocument();
  const siteId = document.rootId;
  const section = Object.values(document.nodes).find(isContainerNode);
  if (!section) {
    throw new Error('Expected fixture to contain a container node');
  }

  const text = createTextNode('block', section.id);
  text.content = createTextDocumentFromText('Hello world');
  const media = createMediaNode('image', section.id);
  const innerContainer = createContainerNode('container', section.id);
  const siblingSection = createContainerNode('section', siteId);

  const site = document.nodes[siteId];
  if (site.contentType !== 'site') {
    throw new Error('Expected site root');
  }

  return {
    document: {
      ...document,
      nodes: {
        ...document.nodes,
        [siteId]: { ...site, children: [...site.children, siblingSection.id] },
        [section.id]: { ...section, children: [...section.children, text.id, media.id, innerContainer.id] },
        [text.id]: text,
        [media.id]: media,
        [innerContainer.id]: innerContainer,
        [siblingSection.id]: siblingSection,
      },
    },
    siteId,
    sectionId: section.id,
    siblingSectionId: siblingSection.id,
    textId: text.id,
    mediaId: media.id,
    innerContainerId: innerContainer.id,
  };
}

describe('applyAiDocumentCommands — per-variant valid application', () => {
  it('setRect updates the node rect', () => {
    const f = createFixture();
    const next = applyAiDocumentCommands(f.document, [
      { type: 'setRect', nodeId: f.textId, field: 'x', value: '42px' },
    ]);
    const node = next.nodes[f.textId];
    expect(node.contentType).not.toBe('site');
    if (node.contentType === 'site') throw new Error('unreachable');
    expect(node.rect.x.base.raw).toBe('42px');
  });

  it('setSticky patches the node sticky definition', () => {
    const f = createFixture();
    const next = applyAiDocumentCommands(f.document, [
      { type: 'setSticky', nodeId: f.sectionId, patch: { enabled: true } },
    ]);
    const node = next.nodes[f.sectionId];
    if (!isContainerNode(node)) throw new Error('expected container');
    expect(node.sticky?.enabled).toBe(true);
  });

  it('setText updates the node name', () => {
    const f = createFixture();
    const next = applyAiDocumentCommands(f.document, [
      { type: 'setText', nodeId: f.textId, field: 'name', value: 'Renamed' },
    ]);
    expect(next.nodes[f.textId].name).toBe('Renamed');
  });

  it('setTextDocumentContent replaces text content', () => {
    const f = createFixture();
    const content = createTextDocumentFromText('Replaced body');
    const next = applyAiDocumentCommands(f.document, [
      { type: 'setTextDocumentContent', nodeId: f.textId, content },
    ]);
    const node = next.nodes[f.textId];
    if (!isTextNode(node)) throw new Error('expected text node');
    expect(JSON.stringify(node.content)).toContain('Replaced body');
  });

  it('insertText appends a text node to the parent', () => {
    const f = createFixture();
    const before = f.document.nodes[f.sectionId].children.length;
    const next = applyAiDocumentCommands(f.document, [{ type: 'insertText', parentId: f.sectionId }]);
    expect(next.nodes[f.sectionId].children.length).toBe(before + 1);
  });

  it('insertContainer appends a container to the parent', () => {
    const f = createFixture();
    const before = f.document.nodes[f.sectionId].children.length;
    const next = applyAiDocumentCommands(f.document, [
      { type: 'insertContainer', subtype: 'container', parentId: f.sectionId },
    ]);
    expect(next.nodes[f.sectionId].children.length).toBe(before + 1);
  });

  it('insertSectionTemplate adds a new section under the site root', () => {
    const f = createFixture();
    const before = f.document.nodes[f.siteId].children.length;
    const next = applyAiDocumentCommands(f.document, [{ type: 'insertSectionTemplate', templateId: 'blank' }]);
    expect(next.nodes[f.siteId].children.length).toBe(before + 1);
  });

  it('deleteNode removes the node from the document', () => {
    const f = createFixture();
    const next = applyAiDocumentCommands(f.document, [{ type: 'deleteNode', nodeId: f.mediaId }]);
    expect(next.nodes[f.mediaId]).toBeUndefined();
  });

  it('setNodeVisibility toggles visibility', () => {
    const f = createFixture();
    const next = applyAiDocumentCommands(f.document, [
      { type: 'setNodeVisibility', nodeId: f.textId, visible: false },
    ]);
    expect(next.nodes[f.textId].visible).toBe(false);
  });

  it('reparentNode moves a node to a new container', () => {
    const f = createFixture();
    const next = applyAiDocumentCommands(f.document, [
      { type: 'reparentNode', nodeId: f.textId, newParentId: f.innerContainerId },
    ]);
    expect(next.nodes[f.textId].parentId).toBe(f.innerContainerId);
    expect(next.nodes[f.innerContainerId].children).toContain(f.textId);
  });

  it('reorderNode changes sibling order', () => {
    const f = createFixture();
    const parent = f.document.nodes[f.sectionId];
    const originalIndex = parent.children.indexOf(f.mediaId);
    const next = applyAiDocumentCommands(f.document, [{ type: 'reorderNode', nodeId: f.mediaId, action: 'back' }]);
    const newIndex = next.nodes[f.sectionId].children.indexOf(f.mediaId);
    expect(newIndex).toBe(originalIndex - 1);
  });

  it('setContainerChildBoundary updates the container layout', () => {
    const f = createFixture();
    const next = applyAiDocumentCommands(f.document, [
      { type: 'setContainerChildBoundary', containerId: f.sectionId, childBoundary: 'box' },
    ]);
    const node = next.nodes[f.sectionId];
    if (!isContainerNode(node)) throw new Error('expected container');
    expect(node.layout?.childBoundary).toBe('box');
  });
});

describe('applyAiDocumentCommands — batch semantics', () => {
  it('applies a multi-command batch where all commands are valid', () => {
    const f = createFixture();
    const next = applyAiDocumentCommands(f.document, [
      { type: 'setText', nodeId: f.textId, field: 'name', value: 'Renamed' },
      { type: 'setNodeVisibility', nodeId: f.mediaId, visible: false },
      { type: 'insertContainer', subtype: 'container', parentId: f.sectionId },
    ]);

    expect(next.nodes[f.textId].name).toBe('Renamed');
    expect(next.nodes[f.mediaId].visible).toBe(false);
    expect(next.nodes[f.sectionId].children.length).toBe(f.document.nodes[f.sectionId].children.length + 1);
  });

  it('applies zero commands when any command targets a non-existent node', () => {
    const f = createFixture();
    const input = structuredClone(f.document);

    let thrown: unknown;
    try {
      applyAiDocumentCommands(f.document, [
        { type: 'setText', nodeId: f.textId, field: 'name', value: 'Renamed' },
        { type: 'deleteNode', nodeId: 'ghost-node' },
      ]);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AiCommandBatchRejectedError);
    expect((thrown as AiCommandBatchRejectedError).reasons).toEqual(['Node ghost-node does not exist']);
    // The original document is untouched: no partial apply of the first command.
    expect(f.document).toEqual(input);
    expect(f.document.nodes[f.textId].name).toBe(input.nodes[f.textId].name);
  });
});
