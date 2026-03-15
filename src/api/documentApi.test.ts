import { describe, expect, it } from 'vitest';
import {
  applyDocumentCommands,
  createInitialDocument,
  insertSectionTemplateBeforeFooter,
  parseDocumentJson,
  serializeDocumentJson,
  setNodeRect,
  setNodeSticky,
  setNodeTextField,
} from './documentApi';

function firstEditableNodeId(document: ReturnType<typeof createInitialDocument>) {
  const id = Object.keys(document.nodes).find((nodeId) => document.nodes[nodeId]?.type !== 'site');
  if (!id) {
    throw new Error('Expected editable node');
  }
  return id;
}

describe('api/documentApi', () => {
  it('updates rect fields immutably', () => {
    const document = createInitialDocument();
    const nodeId = firstEditableNodeId(document);
    const before = document.nodes[nodeId];
    if (before.type === 'site') {
      throw new Error('Expected non-site node');
    }

    const next = setNodeRect(document, nodeId, 'x', '123px');
    expect(next).not.toBe(document);
    expect(next.nodes[nodeId].type).not.toBe('site');
    if (next.nodes[nodeId].type !== 'site') {
      expect(next.nodes[nodeId].rect.x.base.raw).toBe('123px');
    }
    expect(before.rect.x.base.raw).not.toBe('123px');
  });

  it('supports sticky patches through API helpers', () => {
    const document = createInitialDocument();
    const nodeId = firstEditableNodeId(document);
    const next = setNodeSticky(document, nodeId, { enabled: true, durationMode: 'custom' });
    const node = next.nodes[nodeId];
    if (node.type === 'site') {
      throw new Error('Expected non-site node');
    }
    expect(node.sticky?.enabled).toBe(true);
    expect(node.sticky?.durationMode).toBe('custom');
  });

  it('returns original document when text field does not apply to node type', () => {
    const document = createInitialDocument();
    const wrapperId = Object.keys(document.nodes).find(
      (nodeId) => document.nodes[nodeId]?.type === 'wrapper',
    );
    if (!wrapperId) {
      throw new Error('Expected wrapper node');
    }

    const unchanged = setNodeTextField(document, wrapperId, 'content', 'no-op');
    expect(unchanged).toBe(document);
  });

  it('chains commands and serializes/parses valid documents', () => {
    const document = createInitialDocument();
    const textId = Object.keys(document.nodes).find(
      (nodeId) => document.nodes[nodeId]?.type === 'leaf' && document.nodes[nodeId]?.role === 'text',
    );
    if (!textId) {
      throw new Error('Expected text node');
    }

    const next = applyDocumentCommands(document, [
      { type: 'setRect', nodeId: textId, field: 'y', value: '777px' },
      { type: 'setText', nodeId: textId, field: 'content', value: 'Updated by command chain' },
    ]);

    const updatedText = next.nodes[textId];
    if (updatedText.type !== 'leaf' || updatedText.role !== 'text') {
      throw new Error('Expected text node');
    }
    expect(updatedText.rect.y.base.raw).toBe('777px');
    expect(updatedText.content).toBe('Updated by command chain');

    const json = serializeDocumentJson(next);
    const reparsed = parseDocumentJson(json);
    expect(reparsed.nodes[textId]).toEqual(next.nodes[textId]);
  });

  it('rejects invalid documents via parseDocumentJson', () => {
    const bad = {
      rootId: 'site_1',
      nodes: {
        site_1: {
          id: 'site_1',
          type: 'site',
          parentId: null,
          children: ['leaf_1'],
          name: 'Site',
          visible: true,
          locked: false,
        },
        leaf_1: {
          id: 'leaf_1',
          type: 'leaf',
          role: 'text',
          parentId: 'site_1',
          children: [],
          name: 'Bad leaf',
          visible: true,
          locked: false,
          rect: {
            x: { base: { raw: '0px', parsed: { value: 0, unit: 'px' } } },
            y: { base: { raw: '0px', parsed: { value: 0, unit: 'px' } } },
            width: { base: { raw: 'fit-content', parsed: { keyword: 'fit-content' } } },
            height: { base: { raw: 'auto', parsed: { keyword: 'auto' } } },
          },
          content: 'bad',
        },
      },
    };

    expect(() => parseDocumentJson(JSON.stringify(bad))).toThrow('Invalid document');
  });

  it('inserts section templates before footer', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];
    if (!root || root.type !== 'site') {
      throw new Error('Expected site root');
    }
    const footerId = root.children[root.children.length - 1];

    const next = insertSectionTemplateBeforeFooter(document, 'blank');
    const nextRoot = next.nodes[next.rootId];
    if (!nextRoot || nextRoot.type !== 'site') {
      throw new Error('Expected site root');
    }

    expect(nextRoot.children[nextRoot.children.length - 1]).toBe(footerId);
    expect(nextRoot.children.length).toBe(root.children.length + 1);
  });
});
