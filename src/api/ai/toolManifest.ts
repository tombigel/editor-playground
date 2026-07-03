import type { AiToolDefinition } from './types/index';

/**
 * The full v1 AI tool surface: 8 read-only query tools (implemented in
 * Task 2's `queryTools.ts`) followed by the 12 curated mutation commands
 * (implemented in Task 3's `commands.ts`, each wrapping exactly one
 * existing `documentApi` function). This manifest is the single source of
 * truth for the tool surface the model is told about — the orchestration
 * layer's system prompt (Task 6) interpolates from this array rather than
 * duplicating tool names/descriptions by hand.
 */
export const AI_TOOL_MANIFEST: AiToolDefinition[] = [
  {
    name: 'getDocumentTree',
    description: 'Returns the full node tree of the document, including node ids, types, and parent/child relationships.',
    kind: 'query',
    parameters: {},
  },
  {
    name: 'getNodeById',
    description: 'Returns the full data for a single node given its node id.',
    kind: 'query',
    parameters: {
      nodeId: { type: 'string', description: 'The id of the node to look up.' },
    },
  },
  {
    name: 'getSelection',
    description: 'Returns the currently selected node id(s) in the editor.',
    kind: 'query',
    parameters: {},
  },
  {
    name: 'searchNodesByType',
    description: 'Finds all nodes in the document matching a given content type or subtype.',
    kind: 'query',
    parameters: {
      nodeType: { type: 'string', description: 'The content type or subtype to search for.' },
    },
  },
  {
    name: 'searchNodesByText',
    description: 'Finds all text nodes whose content contains a given search string.',
    kind: 'query',
    parameters: {
      query: { type: 'string', description: 'The text to search for.' },
    },
  },
  {
    name: 'getPageList',
    description: 'Returns the list of pages in the site, including their ids, routes, and titles.',
    kind: 'query',
    parameters: {},
  },
  {
    name: 'getActivePage',
    description: 'Returns the currently active/selected page in the editor.',
    kind: 'query',
    parameters: {},
  },
  {
    name: 'getValidationErrors',
    description: 'Runs document and link validation and returns any current validation errors.',
    kind: 'query',
    parameters: {},
  },
  {
    name: 'setRect',
    description: "Sets a single geometry field (x, y, width, or height) on a node's rect.",
    kind: 'mutation',
    parameters: {
      nodeId: { type: 'string' },
      field: { type: 'string', enum: ['x', 'y', 'width', 'height'] },
      value: { type: 'string', description: 'The new value, e.g. "120px" or "50%".' },
    },
  },
  {
    name: 'setSticky',
    description: "Patches a node's sticky positioning configuration (enabled, target, edges, duration mode/values).",
    kind: 'mutation',
    parameters: {
      nodeId: { type: 'string' },
      patch: { type: 'object', description: 'Partial StickyDefinition fields to merge in.' },
    },
  },
  {
    name: 'setText',
    description: "Sets a single editor text field (e.g. name, content, codeLanguage) on a text node.",
    kind: 'mutation',
    parameters: {
      nodeId: { type: 'string' },
      field: { type: 'string', description: 'The EditorTextField to update.' },
      value: { type: 'string' },
    },
  },
  {
    name: 'setTextDocumentContent',
    description: 'Replaces the full rich text document content of a text node.',
    kind: 'mutation',
    parameters: {
      nodeId: { type: 'string' },
      content: { type: 'object', description: 'The new TextDocumentContent.' },
      options: { type: 'object', description: 'Optional SetTextDocumentContentOptions, e.g. clearBlockNodeLink.' },
    },
  },
  {
    name: 'insertText',
    description: 'Inserts a new block text node as the last child of the given parent node.',
    kind: 'mutation',
    parameters: {
      parentId: { type: 'string' },
    },
  },
  {
    name: 'insertContainer',
    description: 'Inserts a new container node of the given subtype as the last child of the given parent node.',
    kind: 'mutation',
    parameters: {
      subtype: { type: 'string', description: 'The ContainerSubtype to create.' },
      parentId: { type: 'string' },
    },
  },
  {
    name: 'insertSectionTemplate',
    description: 'Inserts a pre-built section (from the built-in section template library) into the site, positioned relative to the current selection or a target page.',
    kind: 'mutation',
    parameters: {
      templateId: { type: 'string', description: 'The SectionTemplateId to insert.' },
      options: { type: 'object', description: 'Optional selectedId/pageId to control insertion position.' },
    },
  },
  {
    name: 'deleteNode',
    description: 'Deletes a node and all of its descendants from the document.',
    kind: 'mutation',
    parameters: {
      nodeId: { type: 'string' },
    },
  },
  {
    name: 'setNodeVisibility',
    description: 'Shows or hides a node by setting its visible flag.',
    kind: 'mutation',
    parameters: {
      nodeId: { type: 'string' },
      visible: { type: 'boolean' },
    },
  },
  {
    name: 'reparentNode',
    description: 'Moves a node to become a child of a different (valid) container parent.',
    kind: 'mutation',
    parameters: {
      nodeId: { type: 'string' },
      newParentId: { type: 'string' },
    },
  },
  {
    name: 'reorderNode',
    description: 'Reorders a node among its siblings (move back, forward, send to back, or bring to front).',
    kind: 'mutation',
    parameters: {
      nodeId: { type: 'string' },
      action: { type: 'string', enum: ['back', 'forward', 'sendToBack', 'bringToFront'] },
    },
  },
  {
    name: 'setContainerChildBoundary',
    description: "Sets a container node's child boundary mode, which controls how its children's layout bounds are resolved.",
    kind: 'mutation',
    parameters: {
      containerId: { type: 'string' },
      childBoundary: { type: 'string', description: 'The ContainerChildBoundary to set.' },
    },
  },
];
