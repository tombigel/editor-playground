import {
  cloneDocument,
  deleteNodeDoc,
  insertContainerDoc,
  insertSectionTemplateDoc,
  insertTextDoc,
  reorderNodeDoc,
  reparentNodeDoc,
  setContainerChildBoundaryDoc,
  setNodeRect,
  setNodeSticky,
  setNodeVisibilityDoc,
  setTextDocumentContentDoc,
  setTextNodeContentDoc,
} from '../documentApi';
import type { DocumentModel } from '../documentApi';
import type { AiDocumentCommand } from './types/index';
import { validateAiCommand } from './validation';

/**
 * Thrown by `applyAiDocumentCommands` when at least one command in a batch
 * fails validation against the current document. The batch is rejected
 * all-or-nothing: no command from the batch is applied. `reasons` carries one
 * entry per failing command (in batch order) so the caller can surface every
 * problem at once rather than one at a time.
 */
export class AiCommandBatchRejectedError extends Error {
  readonly reasons: string[];

  constructor(reasons: string[]) {
    super(`AI command batch rejected: ${reasons.join('; ')}`);
    this.name = 'AiCommandBatchRejectedError';
    this.reasons = reasons;
  }
}

/**
 * Apply a batch of AI-proposed mutation commands with all-or-nothing
 * semantics.
 *
 * This mirrors the reduce+`cloneDocument` shape of `applyDocumentCommands`
 * (`src/api/documentApi/basic.ts`) with two deliberate differences required by
 * the plan:
 *
 * 1. Every command is validated against the *current* `document` argument
 *    before anything is applied. This function has no notion of "draft time" —
 *    it only ever sees the document as it is at the moment it is called, so
 *    whoever calls it at approval time is implicitly getting a fresh
 *    re-validation against live state for free. If ANY command fails,
 *    `AiCommandBatchRejectedError` is thrown and no command is applied — this
 *    replaces `applyDocumentCommands`'s silent `default: return next` no-op,
 *    which could otherwise partially apply a stale batch.
 *
 * 2. Each case delegates to exactly one existing, already-tested `*Doc`
 *    function. No new mutation logic is introduced here — only dispatch and
 *    validation wrapping.
 */
export function applyAiDocumentCommands(document: DocumentModel, commands: AiDocumentCommand[]): DocumentModel {
  const reasons: string[] = [];
  for (const command of commands) {
    const result = validateAiCommand(document, command);
    if (!result.valid) {
      reasons.push(result.reason);
    }
  }

  if (reasons.length > 0) {
    throw new AiCommandBatchRejectedError(reasons);
  }

  return commands.reduce<DocumentModel>((next, command) => applyOne(next, command), cloneDocument(document));
}

function applyOne(document: DocumentModel, command: AiDocumentCommand): DocumentModel {
  switch (command.type) {
    case 'setRect':
      return setNodeRect(document, command.nodeId, command.field, command.value);
    case 'setSticky':
      return setNodeSticky(document, command.nodeId, command.patch);
    case 'setText':
      return setTextNodeContentDoc(document, command.nodeId, command.field, command.value);
    case 'setTextDocumentContent':
      return setTextDocumentContentDoc(document, command.nodeId, command.content, command.options);
    case 'insertText':
      return insertTextDoc(document, command.parentId);
    case 'insertContainer':
      return insertContainerDoc(document, command.subtype, command.parentId);
    case 'insertSectionTemplate':
      return insertSectionTemplateDoc(document, command.templateId, command.options);
    case 'deleteNode':
      return deleteNodeDoc(document, command.nodeId);
    case 'setNodeVisibility':
      return setNodeVisibilityDoc(document, command.nodeId, command.visible);
    case 'reparentNode':
      return reparentNodeDoc(document, command.nodeId, command.newParentId);
    case 'reorderNode':
      return reorderNodeDoc(document, command.nodeId, command.action);
    case 'setContainerChildBoundary':
      return setContainerChildBoundaryDoc(document, command.containerId, command.childBoundary);
    default: {
      const exhaustive: never = command;
      throw new Error(`Unhandled AI command type: ${JSON.stringify(exhaustive)}`);
    }
  }
}
