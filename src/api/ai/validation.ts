import { getNode } from '../documentApi';
import type { DocumentModel, DocumentNode, NodeId, NodeOrderAction } from '../documentApi';
import { isContainerNode, isTextNode } from '../../model/types';
import { SECTION_TEMPLATES } from '../../model/defaults';
import type { AiDocumentCommand } from './types/index';

/**
 * Pre-flight validation for a single `AiDocumentCommand` against a concrete
 * `DocumentModel`, run before any mutation is applied.
 *
 * Every underlying `*Doc` function this command layer delegates to silently
 * no-ops (returns the input document unchanged) when its target is missing or
 * of the wrong shape. That silent-no-op behaviour is fine for the interactive
 * editor, but is exactly the failure mode this validation layer exists to
 * catch for AI-proposed batches: a command that would silently do nothing must
 * be surfaced as an explicit rejection with a human-readable reason, never
 * quietly dropped (see the plan's stale-draft handling section).
 */

/**
 * Maximum accepted length (in characters) of a free-text value carried by an
 * AI command (`setRect.value`, `setText.value`). This is a defensive bound
 * against oversized/runaway payloads reaching the mutation layer.
 *
 * NOTE FOR TASK 6: `src/ai/guardrails.ts` does not exist yet. When it lands it
 * is expected to define its own `MAX_TEXT_VALUE_LENGTH`. Task 6's author should
 * check for duplication here and either import/reuse this constant or
 * deliberately supersede it — the two must not silently diverge.
 */
export const MAX_TEXT_VALUE_LENGTH = 10_000;

export type AiCommandValidationResult = { valid: true } | { valid: false; reason: string };

const VALID_ORDER_ACTIONS: readonly NodeOrderAction[] = ['back', 'forward', 'sendToBack', 'bringToFront'];
const VALID_TEMPLATE_IDS = new Set(SECTION_TEMPLATES.map((template) => template.id));

function ok(): AiCommandValidationResult {
  return { valid: true };
}

function fail(reason: string): AiCommandValidationResult {
  return { valid: false, reason };
}

function requireNode(document: DocumentModel, nodeId: NodeId, label = 'Node'): DocumentNode | AiCommandValidationResult {
  const node = getNode(document, nodeId);
  if (!node) {
    return fail(`${label} ${nodeId} does not exist`);
  }
  return node;
}

function isFailure(value: DocumentNode | AiCommandValidationResult): value is AiCommandValidationResult {
  return typeof value === 'object' && value !== null && 'valid' in value;
}

/**
 * A node can accept child insertions only if it is a container or the site
 * root — leaf nodes (text/media) have no meaningful child slot.
 */
function canHoldChildren(node: DocumentNode): boolean {
  return node.contentType === 'container' || node.contentType === 'site';
}

/**
 * Validate a single AI command against the current document. Returns a
 * `{ valid: true }` on success, or `{ valid: false, reason }` with a specific,
 * user-facing rejection reason on failure — never a generic message.
 */
export function validateAiCommand(document: DocumentModel, command: AiDocumentCommand): AiCommandValidationResult {
  switch (command.type) {
    case 'setRect': {
      const node = requireNode(document, command.nodeId);
      if (isFailure(node)) {
        return node;
      }
      if (node.contentType === 'site') {
        return fail(`Cannot set rect on site root node ${command.nodeId}; it has no rect`);
      }
      if (command.value.length > MAX_TEXT_VALUE_LENGTH) {
        return fail(`Rect value for node ${command.nodeId} exceeds the maximum length of ${MAX_TEXT_VALUE_LENGTH} characters`);
      }
      return ok();
    }

    case 'setSticky': {
      const node = requireNode(document, command.nodeId);
      if (isFailure(node)) {
        return node;
      }
      if (node.contentType === 'site') {
        return fail(`Cannot set sticky on site root node ${command.nodeId}; it has no sticky field`);
      }
      return ok();
    }

    case 'setText': {
      const node = requireNode(document, command.nodeId);
      if (isFailure(node)) {
        return node;
      }
      if (!isTextNode(node)) {
        return fail(`Cannot set text field "${command.field}" on ${node.contentType} node ${command.nodeId}; only text nodes support text content`);
      }
      if (command.value.length > MAX_TEXT_VALUE_LENGTH) {
        return fail(`Text value for node ${command.nodeId} exceeds the maximum length of ${MAX_TEXT_VALUE_LENGTH} characters`);
      }
      return ok();
    }

    case 'setTextDocumentContent': {
      const node = requireNode(document, command.nodeId);
      if (isFailure(node)) {
        return node;
      }
      if (!isTextNode(node)) {
        return fail(`Cannot set text document content on ${node.contentType} node ${command.nodeId}; only text nodes support document content`);
      }
      if (!command.content || !Array.isArray(command.content.blocks)) {
        return fail(`Text document content for node ${command.nodeId} is malformed; expected a { blocks: [] } shape`);
      }
      return ok();
    }

    case 'insertText': {
      const parent = requireNode(document, command.parentId, 'Parent node');
      if (isFailure(parent)) {
        return parent;
      }
      if (!canHoldChildren(parent)) {
        return fail(`Cannot insert text into ${parent.contentType} node ${command.parentId}; it cannot contain children`);
      }
      return ok();
    }

    case 'insertContainer': {
      const parent = requireNode(document, command.parentId, 'Parent node');
      if (isFailure(parent)) {
        return parent;
      }
      if (!canHoldChildren(parent)) {
        return fail(`Cannot insert container into ${parent.contentType} node ${command.parentId}; it cannot contain children`);
      }
      return ok();
    }

    case 'insertSectionTemplate': {
      if (!VALID_TEMPLATE_IDS.has(command.templateId)) {
        return fail(`Unknown section template id "${command.templateId}"`);
      }
      const selectedId = command.options?.selectedId;
      if (selectedId != null && !getNode(document, selectedId)) {
        return fail(`Section template reference node ${selectedId} does not exist`);
      }
      const pageId = command.options?.pageId;
      if (pageId != null && !(document.pages ?? []).some((page) => page.id === pageId)) {
        return fail(`Section template target page ${pageId} does not exist`);
      }
      return ok();
    }

    case 'deleteNode': {
      const node = requireNode(document, command.nodeId);
      if (isFailure(node)) {
        return node;
      }
      if (node.contentType === 'site') {
        return fail(`Cannot delete the site root node ${command.nodeId}`);
      }
      if (node.parentId === null) {
        return fail(`Cannot delete node ${command.nodeId}; it has no parent (root-level structural node)`);
      }
      return ok();
    }

    case 'setNodeVisibility': {
      const node = requireNode(document, command.nodeId);
      if (isFailure(node)) {
        return node;
      }
      if (node.contentType === 'site') {
        return fail(`Cannot set visibility on the site root node ${command.nodeId}`);
      }
      return ok();
    }

    case 'reparentNode': {
      const node = requireNode(document, command.nodeId);
      if (isFailure(node)) {
        return node;
      }
      if (node.contentType === 'site') {
        return fail(`Cannot reparent the site root node ${command.nodeId}`);
      }
      const newParent = requireNode(document, command.newParentId, 'New parent node');
      if (isFailure(newParent)) {
        return newParent;
      }
      if (!isContainerNode(newParent)) {
        return fail(`Cannot reparent node ${command.nodeId} into ${newParent.contentType} node ${command.newParentId}; new parent must be a container`);
      }
      if (command.newParentId === command.nodeId) {
        return fail(`Cannot reparent node ${command.nodeId} into itself`);
      }
      return ok();
    }

    case 'reorderNode': {
      const node = requireNode(document, command.nodeId);
      if (isFailure(node)) {
        return node;
      }
      if (node.contentType === 'site') {
        return fail(`Cannot reorder the site root node ${command.nodeId}`);
      }
      if (node.parentId === null) {
        return fail(`Cannot reorder node ${command.nodeId}; it has no parent`);
      }
      if (!VALID_ORDER_ACTIONS.includes(command.action)) {
        return fail(`Unknown reorder action "${command.action}" for node ${command.nodeId}`);
      }
      return ok();
    }

    case 'setContainerChildBoundary': {
      const node = requireNode(document, command.containerId, 'Container node');
      if (isFailure(node)) {
        return node;
      }
      if (!isContainerNode(node)) {
        return fail(`Cannot set child boundary on ${node.contentType} node ${command.containerId}; only containers have a child boundary`);
      }
      if (command.childBoundary !== 'anchor' && command.childBoundary !== 'box') {
        return fail(`Unknown child boundary "${command.childBoundary}" for container ${command.containerId}`);
      }
      return ok();
    }

    default: {
      // Exhaustiveness guard: if a new command variant is added to
      // AiDocumentCommand without a case here, this fails typecheck.
      const exhaustive: never = command;
      return fail(`Unknown AI command type: ${JSON.stringify(exhaustive)}`);
    }
  }
}
