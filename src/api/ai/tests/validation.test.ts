import { describe, expect, it } from 'vitest';
import { createInitialDocument, createMediaNode, createTextNode } from '../../../model/defaults';
import { createTextDocumentContent } from '../../../model/richContent';
import type { DocumentModel, NodeId } from '../../../model/types';
import { isContainerNode } from '../../../model/types';
import { MAX_TEXT_VALUE_LENGTH, validateAiCommand } from '../validation';

type Fixture = {
  document: DocumentModel;
  siteId: NodeId;
  sectionId: NodeId;
  textId: NodeId;
  mediaId: NodeId;
};

/**
 * Builds a fixture document containing the site root, a section container, a
 * text node, and a media node — one representative of every content type the
 * validation layer needs to reason about.
 */
function createFixture(): Fixture {
  const document = createInitialDocument();
  const siteId = document.rootId;
  const section = Object.values(document.nodes).find(isContainerNode);
  if (!section) {
    throw new Error('Expected fixture to contain a container node');
  }

  const text = createTextNode('block', section.id);
  text.content = createTextDocumentContent([]);
  const media = createMediaNode('image', section.id);

  return {
    document: {
      ...document,
      nodes: {
        ...document.nodes,
        [section.id]: { ...section, children: [...section.children, text.id, media.id] },
        [text.id]: text,
        [media.id]: media,
      },
    },
    siteId,
    sectionId: section.id,
    textId: text.id,
    mediaId: media.id,
  };
}

const MISSING = 'node-does-not-exist';

describe('validateAiCommand', () => {
  describe('setRect', () => {
    it('accepts a rect field on a node with a rect', () => {
      const f = createFixture();
      expect(validateAiCommand(f.document, { type: 'setRect', nodeId: f.sectionId, field: 'x', value: '10px' })).toEqual({
        valid: true,
      });
    });

    it('rejects a missing node with a specific reason', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'setRect', nodeId: MISSING, field: 'x', value: '10px' });
      expect(result).toEqual({ valid: false, reason: `Node ${MISSING} does not exist` });
    });

    it('rejects the site root, which has no rect', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'setRect', nodeId: f.siteId, field: 'x', value: '10px' });
      expect(result.valid).toBe(false);
      expect((result as { reason: string }).reason).toContain('site root');
    });

    it('rejects an oversized value', () => {
      const f = createFixture();
      const value = 'x'.repeat(MAX_TEXT_VALUE_LENGTH + 1);
      const result = validateAiCommand(f.document, { type: 'setRect', nodeId: f.sectionId, field: 'x', value });
      expect(result.valid).toBe(false);
      expect((result as { reason: string }).reason).toContain('maximum length');
    });
  });

  describe('setSticky', () => {
    it('accepts a node that supports sticky', () => {
      const f = createFixture();
      expect(
        validateAiCommand(f.document, { type: 'setSticky', nodeId: f.sectionId, patch: { enabled: true } }),
      ).toEqual({ valid: true });
    });

    it('rejects a missing node', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'setSticky', nodeId: MISSING, patch: {} });
      expect(result).toEqual({ valid: false, reason: `Node ${MISSING} does not exist` });
    });

    it('rejects the site root, which has no sticky field', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'setSticky', nodeId: f.siteId, patch: {} });
      expect(result.valid).toBe(false);
      expect((result as { reason: string }).reason).toContain('sticky');
    });
  });

  describe('setText', () => {
    it('accepts a text node', () => {
      const f = createFixture();
      expect(validateAiCommand(f.document, { type: 'setText', nodeId: f.textId, field: 'name', value: 'Hi' })).toEqual({
        valid: true,
      });
    });

    it('rejects a missing node', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'setText', nodeId: MISSING, field: 'name', value: 'Hi' });
      expect(result).toEqual({ valid: false, reason: `Node ${MISSING} does not exist` });
    });

    it('rejects a non-text node (field not applicable to contentType)', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'setText', nodeId: f.mediaId, field: 'name', value: 'Hi' });
      expect(result.valid).toBe(false);
      expect((result as { reason: string }).reason).toContain('only text nodes');
    });

    it('rejects an oversized value', () => {
      const f = createFixture();
      const value = 'x'.repeat(MAX_TEXT_VALUE_LENGTH + 1);
      const result = validateAiCommand(f.document, { type: 'setText', nodeId: f.textId, field: 'content', value });
      expect(result.valid).toBe(false);
      expect((result as { reason: string }).reason).toContain('maximum length');
    });
  });

  describe('setTextDocumentContent', () => {
    it('accepts a text node with well-formed content', () => {
      const f = createFixture();
      expect(
        validateAiCommand(f.document, {
          type: 'setTextDocumentContent',
          nodeId: f.textId,
          content: createTextDocumentContent([]),
        }),
      ).toEqual({ valid: true });
    });

    it('rejects a missing node', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, {
        type: 'setTextDocumentContent',
        nodeId: MISSING,
        content: createTextDocumentContent([]),
      });
      expect(result).toEqual({ valid: false, reason: `Node ${MISSING} does not exist` });
    });

    it('rejects a non-text node', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, {
        type: 'setTextDocumentContent',
        nodeId: f.mediaId,
        content: createTextDocumentContent([]),
      });
      expect(result.valid).toBe(false);
      expect((result as { reason: string }).reason).toContain('only text nodes');
    });

    it('rejects malformed content', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, {
        type: 'setTextDocumentContent',
        nodeId: f.textId,
        // Intentionally malformed to exercise the shape guard.
        content: {} as never,
      });
      expect(result.valid).toBe(false);
      expect((result as { reason: string }).reason).toContain('malformed');
    });
  });

  describe('insertText', () => {
    it('accepts a container parent', () => {
      const f = createFixture();
      expect(validateAiCommand(f.document, { type: 'insertText', parentId: f.sectionId })).toEqual({ valid: true });
    });

    it('accepts the site root as a parent', () => {
      const f = createFixture();
      expect(validateAiCommand(f.document, { type: 'insertText', parentId: f.siteId })).toEqual({ valid: true });
    });

    it('rejects a missing parent', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'insertText', parentId: MISSING });
      expect(result).toEqual({ valid: false, reason: `Parent node ${MISSING} does not exist` });
    });

    it('rejects a leaf parent that cannot contain children', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'insertText', parentId: f.mediaId });
      expect(result.valid).toBe(false);
      expect((result as { reason: string }).reason).toContain('cannot contain children');
    });
  });

  describe('insertContainer', () => {
    it('accepts a container parent', () => {
      const f = createFixture();
      expect(
        validateAiCommand(f.document, { type: 'insertContainer', subtype: 'container', parentId: f.sectionId }),
      ).toEqual({ valid: true });
    });

    it('rejects a missing parent', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'insertContainer', subtype: 'container', parentId: MISSING });
      expect(result).toEqual({ valid: false, reason: `Parent node ${MISSING} does not exist` });
    });

    it('rejects a leaf parent', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'insertContainer', subtype: 'container', parentId: f.textId });
      expect(result.valid).toBe(false);
      expect((result as { reason: string }).reason).toContain('cannot contain children');
    });
  });

  describe('insertSectionTemplate', () => {
    it('accepts a valid template id', () => {
      const f = createFixture();
      expect(validateAiCommand(f.document, { type: 'insertSectionTemplate', templateId: 'blank' })).toEqual({
        valid: true,
      });
    });

    it('rejects an unknown template id', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, {
        type: 'insertSectionTemplate',
        templateId: 'not-a-template' as never,
      });
      expect(result.valid).toBe(false);
      expect((result as { reason: string }).reason).toContain('Unknown section template');
    });

    it('rejects a missing reference node', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, {
        type: 'insertSectionTemplate',
        templateId: 'blank',
        options: { selectedId: MISSING },
      });
      expect(result.valid).toBe(false);
      expect((result as { reason: string }).reason).toContain(MISSING);
    });
  });

  describe('deleteNode', () => {
    it('accepts a deletable node', () => {
      const f = createFixture();
      expect(validateAiCommand(f.document, { type: 'deleteNode', nodeId: f.textId })).toEqual({ valid: true });
    });

    it('rejects a missing node', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'deleteNode', nodeId: MISSING });
      expect(result).toEqual({ valid: false, reason: `Node ${MISSING} does not exist` });
    });

    it('rejects deleting the site root', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'deleteNode', nodeId: f.siteId });
      expect(result.valid).toBe(false);
      expect((result as { reason: string }).reason).toContain('site root');
    });
  });

  describe('setNodeVisibility', () => {
    it('accepts a non-site node', () => {
      const f = createFixture();
      expect(validateAiCommand(f.document, { type: 'setNodeVisibility', nodeId: f.textId, visible: false })).toEqual({
        valid: true,
      });
    });

    it('rejects a missing node', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'setNodeVisibility', nodeId: MISSING, visible: false });
      expect(result).toEqual({ valid: false, reason: `Node ${MISSING} does not exist` });
    });

    it('rejects the site root', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'setNodeVisibility', nodeId: f.siteId, visible: false });
      expect(result.valid).toBe(false);
      expect((result as { reason: string }).reason).toContain('site root');
    });
  });

  describe('reparentNode', () => {
    it('accepts reparenting into a container', () => {
      const f = createFixture();
      expect(
        validateAiCommand(f.document, { type: 'reparentNode', nodeId: f.textId, newParentId: f.sectionId }),
      ).toEqual({ valid: true });
    });

    it('rejects a missing node', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'reparentNode', nodeId: MISSING, newParentId: f.sectionId });
      expect(result).toEqual({ valid: false, reason: `Node ${MISSING} does not exist` });
    });

    it('rejects a missing new parent', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'reparentNode', nodeId: f.textId, newParentId: MISSING });
      expect(result).toEqual({ valid: false, reason: `New parent node ${MISSING} does not exist` });
    });

    it('rejects reparenting into a non-container node', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'reparentNode', nodeId: f.textId, newParentId: f.mediaId });
      expect(result.valid).toBe(false);
      expect((result as { reason: string }).reason).toContain('must be a container');
    });
  });

  describe('reorderNode', () => {
    it('accepts a valid reorder action', () => {
      const f = createFixture();
      expect(validateAiCommand(f.document, { type: 'reorderNode', nodeId: f.textId, action: 'forward' })).toEqual({
        valid: true,
      });
    });

    it('rejects a missing node', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, { type: 'reorderNode', nodeId: MISSING, action: 'forward' });
      expect(result).toEqual({ valid: false, reason: `Node ${MISSING} does not exist` });
    });

    it('rejects an unknown action', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, {
        type: 'reorderNode',
        nodeId: f.textId,
        action: 'sideways' as never,
      });
      expect(result.valid).toBe(false);
      expect((result as { reason: string }).reason).toContain('Unknown reorder action');
    });
  });

  describe('setContainerChildBoundary', () => {
    it('accepts a container', () => {
      const f = createFixture();
      expect(
        validateAiCommand(f.document, {
          type: 'setContainerChildBoundary',
          containerId: f.sectionId,
          childBoundary: 'box',
        }),
      ).toEqual({ valid: true });
    });

    it('rejects a missing container', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, {
        type: 'setContainerChildBoundary',
        containerId: MISSING,
        childBoundary: 'box',
      });
      expect(result).toEqual({ valid: false, reason: `Container node ${MISSING} does not exist` });
    });

    it('rejects a non-container node', () => {
      const f = createFixture();
      const result = validateAiCommand(f.document, {
        type: 'setContainerChildBoundary',
        containerId: f.textId,
        childBoundary: 'box',
      });
      expect(result.valid).toBe(false);
      expect((result as { reason: string }).reason).toContain('only containers');
    });
  });
});
