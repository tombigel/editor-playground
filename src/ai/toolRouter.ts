import {
  getActivePage,
  getDocumentTree,
  getNodeById,
  getPageList,
  getSelection,
  getValidationErrors,
  searchNodesByText,
  searchNodesByType,
  type AiNodeSearchType,
} from '../api/ai/queryTools';
import { validateAiCommand } from '../api/ai/validation';
import type { AiDocumentCommand } from '../api/ai/types';
import type { DocumentModel } from '../model/types';
import type { EditorState } from '../editor/types/index';
import { isToolAllowlisted } from './guardrails';
import type { ToolCall, ToolResult } from './types/index';

/**
 * Routes a single {@link ToolCall} to either a read-only query execution or a
 * validated-but-unapplied mutation draft.
 *
 * STRUCTURAL GUARANTEE: this function's signature takes `document`/
 * `editorState` as plain read-only input data — there is no dispatcher, store,
 * or `applyAiCommands`/`applyAiDocumentCommands` reference passed in anywhere,
 * and this module never imports either. That means there is no way for this
 * function to mutate the document even if it wanted to: it can only ever
 * return data (`kind: 'query'`) or a staged draft (`kind: 'mutation'`) for a
 * human to later approve through the one real apply path
 * (`editorApi.applyAiCommands`, called only from the Approve button in the UI
 * layer). Do not add a dispatcher/mutate parameter to this function — that
 * would defeat the entire point of this boundary.
 *
 * BATCH-SIZE RESPONSIBILITY NOTE: a single `ToolCall` maps to at most one
 * `AiDocumentCommand` here, so `MAX_COMMANDS_PER_BATCH`/`isBatchSizeAllowed`
 * enforcement does not belong in this function — it has nothing to batch.
 * Accumulating multiple routed mutation results from one assistant turn into
 * a single `DraftBatch`, and enforcing the batch-size cap on that
 * accumulation, is `conversationStore.ts`'s responsibility.
 */
export function routeToolCall(
  call: ToolCall,
  context: { document: DocumentModel; editorState: EditorState },
): ToolResult {
  if (!isToolAllowlisted(call.name)) {
    return rejected(call, `Tool "${call.name}" is not allowlisted`);
  }

  const queryResult = routeQueryTool(call, context);
  if (queryResult) {
    return queryResult;
  }

  const mutationResult = routeMutationTool(call, context);
  if (mutationResult) {
    return mutationResult;
  }

  // Allowlisted (present in AI_TOOL_MANIFEST) but not recognized by either
  // dispatch table below — should be unreachable in practice since the
  // allowlist is derived from the same manifest, but never fall through to a
  // silent no-op.
  return rejected(call, `Tool "${call.name}" is allowlisted but not implemented by the router`);
}

function rejected(call: ToolCall, error: string): ToolResult {
  return { toolCallId: call.id, kind: 'query', error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

const AI_NODE_SEARCH_TYPES = [
  'container',
  'text',
  'media',
  'section',
  'header',
  'footer',
  'group',
  'nav',
  'aside',
  'article',
  'block',
  'rich',
  'code',
  'list',
  'image',
  'video',
  'svg',
  'embed',
] as const satisfies readonly AiNodeSearchType[];

function isAiNodeSearchType(value: unknown): value is AiNodeSearchType {
  return isString(value) && AI_NODE_SEARCH_TYPES.includes(value as AiNodeSearchType);
}

/**
 * Executes one of the 8 read-only query tools immediately. Returns `null` if
 * `call.name` does not match a query tool name, so the caller can fall
 * through to mutation routing.
 */
function routeQueryTool(
  call: ToolCall,
  { document, editorState }: { document: DocumentModel; editorState: EditorState },
): ToolResult | null {
  const args = call.arguments;

  switch (call.name) {
    case 'getDocumentTree':
      return queryOk(call, getDocumentTree(document));

    case 'getNodeById': {
      if (!isString(args.nodeId)) {
        return rejected(call, 'getNodeById requires a string "nodeId" argument');
      }
      return queryOk(call, getNodeById(document, args.nodeId) ?? null);
    }

    case 'getSelection':
      return queryOk(call, getSelection(editorState));

    case 'searchNodesByType': {
      if (!isAiNodeSearchType(args.nodeType)) {
        return rejected(call, `searchNodesByType requires a "nodeType" argument of ${AI_NODE_SEARCH_TYPES.join(', ')}`);
      }
      return queryOk(call, searchNodesByType(document, args.nodeType));
    }

    case 'searchNodesByText': {
      if (!isString(args.query)) {
        return rejected(call, 'searchNodesByText requires a string "query" argument');
      }
      return queryOk(call, searchNodesByText(document, args.query));
    }

    case 'getPageList':
      return queryOk(call, getPageList(document));

    case 'getActivePage':
      return queryOk(call, getActivePage(document, editorState));

    case 'getValidationErrors':
      return queryOk(call, getValidationErrors(document));

    default:
      return null;
  }
}

function queryOk(call: ToolCall, data: unknown): ToolResult {
  return { toolCallId: call.id, kind: 'query', queryData: data };
}

/**
 * Builds and validates one of the 12 mutation commands from `call.arguments`,
 * returning a staged (never applied) draft `ToolResult`. Returns `null` if
 * `call.name` does not match a mutation tool name.
 */
function routeMutationTool(
  call: ToolCall,
  { document }: { document: DocumentModel; editorState: EditorState },
): ToolResult | null {
  const built = buildCommand(call);
  if (built === null) {
    // Not a recognized mutation tool name at all.
    return null;
  }
  if ('error' in built) {
    return rejected(call, built.error);
  }

  const command = built.command;
  const validation = validateAiCommand(document, command);
  if (!validation.valid) {
    return rejected(call, validation.reason);
  }

  return { toolCallId: call.id, kind: 'mutation', draftCommands: [command] };
}

type BuildResult = { command: AiDocumentCommand } | { error: string };

/**
 * Defensively coerces `call.arguments` (untrusted model output) into a typed
 * `AiDocumentCommand`. Returns `null` when `call.name` isn't a mutation tool,
 * or `{ error }` when the shape doesn't match what the command needs — never
 * throws and never calls a `*Doc`/validation function with garbage.
 */
function buildCommand(call: ToolCall): BuildResult | null {
  const args = call.arguments;

  switch (call.name) {
    case 'setRect': {
      if (
        !isString(args.nodeId) ||
        !isString(args.field) ||
        !['x', 'y', 'width', 'height'].includes(args.field) ||
        !isString(args.value)
      ) {
        return { error: 'setRect requires "nodeId" (string), "field" (x|y|width|height), and "value" (string)' };
      }
      return { command: { type: 'setRect', nodeId: args.nodeId, field: args.field as 'x' | 'y' | 'width' | 'height', value: args.value } };
    }

    case 'setSticky': {
      if (!isString(args.nodeId) || !isRecord(args.patch)) {
        return { error: 'setSticky requires "nodeId" (string) and "patch" (object)' };
      }
      return { command: { type: 'setSticky', nodeId: args.nodeId, patch: args.patch } };
    }

    case 'setText': {
      if (!isString(args.nodeId) || !isString(args.field) || !isString(args.value)) {
        return { error: 'setText requires "nodeId" (string), "field" (string), and "value" (string)' };
      }
      return {
        command: {
          type: 'setText',
          nodeId: args.nodeId,
          field: args.field as AiDocumentCommand extends { type: 'setText'; field: infer F } ? F : never,
          value: args.value,
        },
      };
    }

    case 'setTextDocumentContent': {
      if (!isString(args.nodeId) || !isRecord(args.content) || !Array.isArray(args.content.blocks)) {
        return { error: 'setTextDocumentContent requires "nodeId" (string) and "content" (object with a "blocks" array)' };
      }
      const options = args.options === undefined ? undefined : isRecord(args.options) ? args.options : undefined;
      if (args.options !== undefined && options === undefined) {
        return { error: 'setTextDocumentContent "options", when provided, must be an object' };
      }
      return {
        command: {
          type: 'setTextDocumentContent',
          nodeId: args.nodeId,
          content: args.content as AiDocumentCommand extends { type: 'setTextDocumentContent'; content: infer C } ? C : never,
          options: options as AiDocumentCommand extends { type: 'setTextDocumentContent'; options?: infer O } ? O : never,
        },
      };
    }

    case 'insertText': {
      if (!isString(args.parentId)) {
        return { error: 'insertText requires "parentId" (string)' };
      }
      return { command: { type: 'insertText', parentId: args.parentId } };
    }

    case 'insertContainer': {
      if (!isString(args.subtype) || !isString(args.parentId)) {
        return { error: 'insertContainer requires "subtype" (string) and "parentId" (string)' };
      }
      return {
        command: {
          type: 'insertContainer',
          subtype: args.subtype as AiDocumentCommand extends { type: 'insertContainer'; subtype: infer S } ? S : never,
          parentId: args.parentId,
        },
      };
    }

    case 'insertSectionTemplate': {
      if (!isString(args.templateId)) {
        return { error: 'insertSectionTemplate requires "templateId" (string)' };
      }
      let options: { selectedId?: string | null; pageId?: string | null } | undefined;
      if (args.options !== undefined) {
        if (!isRecord(args.options)) {
          return { error: 'insertSectionTemplate "options", when provided, must be an object' };
        }
        const { selectedId, pageId } = args.options;
        if (selectedId !== undefined && selectedId !== null && !isString(selectedId)) {
          return { error: 'insertSectionTemplate "options.selectedId", when provided, must be a string or null' };
        }
        if (pageId !== undefined && pageId !== null && !isString(pageId)) {
          return { error: 'insertSectionTemplate "options.pageId", when provided, must be a string or null' };
        }
        options = { selectedId: selectedId as string | null | undefined, pageId: pageId as string | null | undefined };
      }
      return {
        command: {
          type: 'insertSectionTemplate',
          templateId: args.templateId as AiDocumentCommand extends { type: 'insertSectionTemplate'; templateId: infer T } ? T : never,
          options,
        },
      };
    }

    case 'deleteNode': {
      if (!isString(args.nodeId)) {
        return { error: 'deleteNode requires "nodeId" (string)' };
      }
      return { command: { type: 'deleteNode', nodeId: args.nodeId } };
    }

    case 'setNodeVisibility': {
      if (!isString(args.nodeId) || !isBoolean(args.visible)) {
        return { error: 'setNodeVisibility requires "nodeId" (string) and "visible" (boolean)' };
      }
      return { command: { type: 'setNodeVisibility', nodeId: args.nodeId, visible: args.visible } };
    }

    case 'reparentNode': {
      if (!isString(args.nodeId) || !isString(args.newParentId)) {
        return { error: 'reparentNode requires "nodeId" (string) and "newParentId" (string)' };
      }
      return { command: { type: 'reparentNode', nodeId: args.nodeId, newParentId: args.newParentId } };
    }

    case 'reorderNode': {
      const validActions = ['back', 'forward', 'sendToBack', 'bringToFront'];
      if (!isString(args.nodeId) || !isString(args.action) || !validActions.includes(args.action)) {
        return { error: 'reorderNode requires "nodeId" (string) and "action" (back|forward|sendToBack|bringToFront)' };
      }
      return {
        command: {
          type: 'reorderNode',
          nodeId: args.nodeId,
          action: args.action as AiDocumentCommand extends { type: 'reorderNode'; action: infer A } ? A : never,
        },
      };
    }

    case 'setContainerChildBoundary': {
      if (!isString(args.containerId) || !isString(args.childBoundary) || (args.childBoundary !== 'anchor' && args.childBoundary !== 'box')) {
        return { error: 'setContainerChildBoundary requires "containerId" (string) and "childBoundary" (anchor|box)' };
      }
      return { command: { type: 'setContainerChildBoundary', containerId: args.containerId, childBoundary: args.childBoundary } };
    }

    default:
      return null;
  }
}
