import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../editor/editorPersistenceState';
import { buildDirectOperationContextMessage, classifyAiRequest } from '../requestRouting';

describe('ai/requestRouting classifyAiRequest', () => {
  it('routes draft approval and rejection only when a pending draft exists', () => {
    expect(classifyAiRequest('make the change', { hasPendingDraft: true })).toEqual({
      kind: 'draftControl',
      action: 'approve',
    });
    expect(classifyAiRequest('  CANCEL  ', { hasPendingDraft: true })).toEqual({
      kind: 'draftControl',
      action: 'reject',
    });
    expect(classifyAiRequest('make the change', { hasPendingDraft: false }).kind).toBe('normalChat');
  });

  it('routes help requests to existing help targets', () => {
    expect(classifyAiRequest('help', { hasPendingDraft: false })).toEqual({
      kind: 'helpRequest',
      target: 'gettingStarted',
    });
    expect(classifyAiRequest('show shortcuts', { hasPendingDraft: false })).toEqual({
      kind: 'helpRequest',
      target: 'shortcuts',
    });
    expect(classifyAiRequest('how do AI tools work?', { hasPendingDraft: false })).toEqual({
      kind: 'helpRequest',
      target: 'aiApi',
    });
    expect(classifyAiRequest('open API docs', { hasPendingDraft: false })).toEqual({
      kind: 'helpRequest',
      target: 'api',
    });
  });

  it('routes question-form history and draft control phrases to help instead', () => {
    expect(classifyAiRequest('how do I undo something?', { hasPendingDraft: false })).toEqual({
      kind: 'helpRequest',
      target: 'gettingStarted',
    });
    expect(classifyAiRequest('how do I redo an undo?', { hasPendingDraft: false })).toEqual({
      kind: 'helpRequest',
      target: 'gettingStarted',
    });
    expect(classifyAiRequest('how do I approve this?', { hasPendingDraft: true })).toEqual({
      kind: 'helpRequest',
      target: 'gettingStarted',
    });
  });

  it('routes undo and carefully scoped redo phrases to local history control', () => {
    expect(classifyAiRequest('undo', { hasPendingDraft: false })).toEqual({
      kind: 'historyControl',
      action: 'undo',
    });
    expect(classifyAiRequest('revert the last change', { hasPendingDraft: false })).toEqual({
      kind: 'historyControl',
      action: 'undo',
    });
    expect(classifyAiRequest('cancel last change', { hasPendingDraft: true })).toEqual({
      kind: 'historyControl',
      action: 'undo',
    });
    expect(classifyAiRequest('redo', { hasPendingDraft: false })).toEqual({
      kind: 'historyControl',
      action: 'redo',
    });
    expect(classifyAiRequest('undo the undo', { hasPendingDraft: false })).toEqual({
      kind: 'historyControl',
      action: 'redo',
    });
    expect(classifyAiRequest('cancel', { hasPendingDraft: true })).toEqual({
      kind: 'draftControl',
      action: 'reject',
    });
  });

  it('routes direct operations with shallow command words and target hints', () => {
    expect(classifyAiRequest('  MOVE   selected text 20px right ', { hasPendingDraft: false })).toEqual({
      kind: 'directOperation',
      commandWords: ['move'],
      targetHints: ['selected', 'text'],
    });
    expect(classifyAiRequest('delte this image block', { hasPendingDraft: false })).toEqual({
      kind: 'directOperation',
      commandWords: ['delete'],
      targetHints: ['this', 'image', 'block'],
    });
  });
});

describe('ai/requestRouting buildDirectOperationContextMessage', () => {
  it('includes selected node summaries and direct-operation instructions', () => {
    const state = createInitialState();
    const selectedNode = Object.values(state.document.nodes).find((node) => node.contentType === 'text');
    if (!selectedNode) {
      throw new Error('Expected default state to include a text node');
    }
    const selectedState = {
      ...state,
      selectedId: selectedNode.id,
      selectedIds: [selectedNode.id],
    };
    const route = classifyAiRequest('move selected 20px right', { hasPendingDraft: false });
    if (route.kind !== 'directOperation') {
      throw new Error('Expected direct operation route');
    }

    const message = buildDirectOperationContextMessage(state.document, selectedState, route);

    expect(message).toContain('direct editor operation');
    expect(message).toContain(selectedNode.id);
    expect(message).toContain('"selectedIds"');
    expect(message).toContain('"rect"');
    expect(message).toContain('call the appropriate mutation tool now');
    expect(message).toContain('ask one concise clarification');
  });
});
