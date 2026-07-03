import { describe, expect, it } from 'vitest';
import { createInitialDocument, createTextNode } from '../../../model/defaults';
import { createTextDocumentFromText } from '../../../model/richContent';
import { deleteNodeDoc } from '../../documentApi';
import type { DocumentModel, NodeId } from '../../../model/types';
import { isContainerNode } from '../../../model/types';
import type { AiDocumentCommand } from '../types/index';
import { AiCommandBatchRejectedError, applyAiDocumentCommands } from '../commands';
import { MAX_TEXT_VALUE_LENGTH } from '../validation';

type Fixture = {
  document: DocumentModel;
  sectionId: NodeId;
  textId: NodeId;
};

/** Builds a document fixture with a known text node inside an existing section. */
function createFixture(): Fixture {
  const document = createInitialDocument();
  const section = Object.values(document.nodes).find(isContainerNode);
  if (!section) {
    throw new Error('Expected fixture to contain a container node');
  }

  const text = createTextNode('block', section.id);
  text.content = createTextDocumentFromText('Hello world');

  return {
    document: {
      ...document,
      nodes: {
        ...document.nodes,
        [section.id]: { ...section, children: [...section.children, text.id] },
        [text.id]: text,
      },
    },
    sectionId: section.id,
    textId: text.id,
  };
}

/** Applies a batch and returns the thrown error, or null if it applied cleanly. */
function catchReject(document: DocumentModel, commands: AiDocumentCommand[]): AiCommandBatchRejectedError | null {
  try {
    applyAiDocumentCommands(document, commands);
    return null;
  } catch (error) {
    if (error instanceof AiCommandBatchRejectedError) {
      return error;
    }
    throw error;
  }
}

describe('AI command batch security', () => {
  it('rejects a command targeting a non-existent node id', () => {
    const f = createFixture();
    const input = structuredClone(f.document);

    const error = catchReject(f.document, [{ type: 'deleteNode', nodeId: 'does-not-exist' }]);

    expect(error).toBeInstanceOf(AiCommandBatchRejectedError);
    expect(error?.reasons).toEqual(['Node does-not-exist does not exist']);
    // Provably unchanged: rejection never reached deleteNodeDoc.
    expect(f.document).toEqual(input);
  });

  it('rejects an oversized text payload using the MAX_TEXT_VALUE_LENGTH bound', () => {
    const f = createFixture();
    const input = structuredClone(f.document);
    const oversized = 'a'.repeat(MAX_TEXT_VALUE_LENGTH + 1);

    const error = catchReject(f.document, [{ type: 'setText', nodeId: f.textId, field: 'content', value: oversized }]);

    expect(error).toBeInstanceOf(AiCommandBatchRejectedError);
    expect(error?.reasons[0]).toContain('maximum length');
    expect(f.document).toEqual(input);
  });

  it('rejects malformed text document content', () => {
    const f = createFixture();
    const input = structuredClone(f.document);

    const error = catchReject(f.document, [
      { type: 'setTextDocumentContent', nodeId: f.textId, content: { notBlocks: true } as never },
    ]);

    expect(error).toBeInstanceOf(AiCommandBatchRejectedError);
    expect(error?.reasons[0]).toContain('malformed');
    expect(f.document).toEqual(input);
  });

  it('collects every rejection reason in a batch, not just the first', () => {
    const f = createFixture();

    const error = catchReject(f.document, [
      { type: 'deleteNode', nodeId: 'ghost-a' },
      { type: 'setText', nodeId: 'ghost-b', field: 'name', value: 'x' },
    ]);

    expect(error?.reasons).toEqual(['Node ghost-a does not exist', 'Node ghost-b does not exist']);
  });

  it('never applies any command from a batch that contains one invalid command', () => {
    const f = createFixture();
    const input = structuredClone(f.document);

    const error = catchReject(f.document, [
      { type: 'setText', nodeId: f.textId, field: 'name', value: 'Would-Be-Applied' },
      { type: 'setNodeVisibility', nodeId: 'ghost', visible: false },
    ]);

    expect(error).toBeInstanceOf(AiCommandBatchRejectedError);
    // The valid first command must NOT have been applied — provably unchanged.
    expect(f.document).toEqual(input);
    expect(f.document.nodes[f.textId].name).toBe(input.nodes[f.textId].name);
  });

  it('re-validates against current state: a stale batch (node deleted after draft) is rejected wholesale', () => {
    const f = createFixture();

    // A batch that is valid against state A (the fixture as drafted).
    const batch: AiDocumentCommand[] = [
      { type: 'setText', nodeId: f.textId, field: 'name', value: 'Rename during draft' },
      { type: 'setNodeVisibility', nodeId: f.textId, visible: false },
    ];

    // Every command in the batch validates cleanly against state A.
    const cleanAgainstA = catchReject(f.document, [...batch]);
    expect(cleanAgainstA).toBeNull();

    // Now the document moves to state B via a normal documentApi mutation:
    // the very node the batch targets is deleted before approval.
    const stateB = deleteNodeDoc(f.document, f.textId);
    expect(stateB.nodes[f.textId]).toBeUndefined();
    const stateBSnapshot = structuredClone(stateB);

    // Applying the original (stale) batch against state B must reject the
    // WHOLE batch — not partially apply — because it is re-validated against
    // the current document, not the stale state it was drafted against.
    const staleError = catchReject(stateB, batch);
    expect(staleError).toBeInstanceOf(AiCommandBatchRejectedError);
    expect(staleError?.reasons).toEqual([
      `Node ${f.textId} does not exist`,
      `Node ${f.textId} does not exist`,
    ]);
    // State B is provably unchanged: no partial commit occurred.
    expect(stateB).toEqual(stateBSnapshot);
  });
});
