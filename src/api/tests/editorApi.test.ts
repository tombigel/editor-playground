import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  getValidationErrors,
  parseUnitValue,
  SECTION_TEMPLATES,
  serializeDocumentJson,
  type AiDocumentCommand,
  type EditorState,
} from '../editorApi';
import { createHistoryState, historyReducer } from '../../app/editorState';
import type { HistoryState } from '../../app/editorState';
import { isContainerNode, isTextNode } from '../../model/types';

describe('api/editorApi', () => {
  it('exposes the editor boundary as named bindings', () => {
    const state = createInitialState();
    const serialized = JSON.parse(serializeDocumentJson(state.document)) as {
      rootId: string;
      nodes: Record<string, unknown>;
    };

    expect(parseUnitValue('24px')).toMatchObject({
      raw: '24px',
      parsed: { value: 24, unit: 'px' },
    });
    expect(SECTION_TEMPLATES.length).toBeGreaterThan(0);
    expect(getValidationErrors(state)).toEqual([]);
    expect(createInitialState().document.rootId).toBeDefined();
    expect(serialized.rootId).toBe(state.document.rootId);
    expect(serialized.nodes).toHaveProperty(state.document.rootId);
    expect(state.document.rootId).toBeDefined();
  });
});

/**
 * Locates a text leaf and its container section within a fresh initial
 * document, so the batches below exercise real node ids rather than a
 * synthetic fixture.
 */
function findAiCommandTargets(state: EditorState) {
  const section = Object.values(state.document.nodes).find(isContainerNode);
  if (!section) {
    throw new Error('Expected initial document to contain a container node');
  }
  const textId = section.children.find((childId) => isTextNode(state.document.nodes[childId]));
  if (!textId) {
    throw new Error('Expected initial document section to contain a text node');
  }
  return { sectionId: section.id, textId };
}

function createTestHistoryState(): HistoryState {
  return createHistoryState();
}

describe('api/editorApi — applyAiCommands single-undo batch commit', () => {
  it('commits a valid multi-command batch as exactly one history entry', () => {
    const historyState = createTestHistoryState();
    const { sectionId, textId } = findAiCommandTargets(historyState.present);

    const commands: AiDocumentCommand[] = [
      { type: 'setText', nodeId: textId, field: 'name', value: 'AI renamed node' },
      { type: 'setNodeVisibility', nodeId: textId, visible: false },
      { type: 'insertContainer', subtype: 'container', parentId: sectionId },
    ];

    expect(historyState.past).toHaveLength(0);

    const next = historyReducer(historyState, { type: 'applyAiCommands', commands });

    // Exactly one new history entry for the whole batch, not one per command.
    expect(next.past).toHaveLength(1);
    expect(next.future).toHaveLength(0);

    expect(next.present.document.nodes[textId].name).toBe('AI renamed node');
    expect(next.present.document.nodes[textId].visible).toBe(false);
    expect(next.present.document.nodes[sectionId].children.length).toBe(
      historyState.present.document.nodes[sectionId].children.length + 1,
    );
  });

  it('reverts the entire batch in a single undo step', () => {
    const historyState = createTestHistoryState();
    const { sectionId, textId } = findAiCommandTargets(historyState.present);
    const originalName = historyState.present.document.nodes[textId].name;
    const originalVisible = historyState.present.document.nodes[textId].visible;
    const originalChildCount = historyState.present.document.nodes[sectionId].children.length;

    const commands: AiDocumentCommand[] = [
      { type: 'setText', nodeId: textId, field: 'name', value: 'AI renamed node' },
      { type: 'setNodeVisibility', nodeId: textId, visible: false },
      { type: 'insertContainer', subtype: 'container', parentId: sectionId },
    ];

    const afterApply = historyReducer(historyState, { type: 'applyAiCommands', commands });
    expect(afterApply.past).toHaveLength(1);

    const afterUndo = historyReducer(afterApply, { type: 'undo' });

    expect(afterUndo.past).toHaveLength(0);
    expect(afterUndo.future).toHaveLength(1);
    expect(afterUndo.present.document.nodes[textId].name).toBe(originalName);
    expect(afterUndo.present.document.nodes[textId].visible).toBe(originalVisible);
    expect(afterUndo.present.document.nodes[sectionId].children.length).toBe(originalChildCount);
  });

  it('rejects a batch containing an invalid command with zero new history entries and no document change', () => {
    const historyState = createTestHistoryState();
    const { sectionId, textId } = findAiCommandTargets(historyState.present);
    const originalDocument = historyState.present.document;

    const commands: AiDocumentCommand[] = [
      { type: 'setText', nodeId: textId, field: 'name', value: 'Should not apply' },
      { type: 'deleteNode', nodeId: 'ghost-node-that-does-not-exist' },
      { type: 'insertContainer', subtype: 'container', parentId: sectionId },
    ];

    const next = historyReducer(historyState, { type: 'applyAiCommands', commands });

    // A rejected batch is a true no-op: no history entry, no document mutation.
    expect(next.past).toHaveLength(0);
    expect(next.future).toHaveLength(0);
    expect(next.present.document).toBe(originalDocument);
    expect(next.present.document.nodes[textId].name).not.toBe('Should not apply');
    expect(next.present.document.nodes[sectionId].children.length).toBe(
      originalDocument.nodes[sectionId].children.length,
    );
  });
});
