import type {
  ContainerChildBoundary,
  ContainerSubtype,
  EditorTextField,
  NodeId,
  NodeOrderAction,
  SetTextDocumentContentOptions,
  StickyDefinition,
} from '../../documentApi';
import type { PageId, SectionTemplateId, TextDocumentContent } from '../../../model/types';

/**
 * Discriminated union of the v1 curated AI mutation command surface.
 *
 * Each variant is a thin, structurally-typed wrapper around exactly one
 * existing `documentApi` (`*Doc`) function. This union intentionally does
 * not expose the full `documentApi` surface — see the plan's "Confirmed
 * scope decisions" for the deferred operations (clipboard, animation,
 * fonts, page/site structure).
 */
export type AiDocumentCommand =
  | {
      type: 'setRect';
      nodeId: NodeId;
      field: 'x' | 'y' | 'width' | 'height';
      value: string;
    }
  | {
      type: 'setSticky';
      nodeId: NodeId;
      patch: Partial<StickyDefinition>;
    }
  | {
      type: 'setText';
      nodeId: NodeId;
      field: EditorTextField;
      value: string;
    }
  | {
      type: 'setTextDocumentContent';
      nodeId: NodeId;
      content: TextDocumentContent;
      options?: SetTextDocumentContentOptions;
    }
  | {
      type: 'insertText';
      parentId: NodeId;
    }
  | {
      type: 'insertContainer';
      subtype: ContainerSubtype;
      parentId: NodeId;
    }
  | {
      type: 'insertSectionTemplate';
      templateId: SectionTemplateId;
      options?: {
        selectedId?: NodeId | null;
        pageId?: PageId | null;
      };
    }
  | {
      type: 'deleteNode';
      nodeId: NodeId;
    }
  | {
      type: 'setNodeVisibility';
      nodeId: NodeId;
      visible: boolean;
    }
  | {
      type: 'reparentNode';
      nodeId: NodeId;
      newParentId: NodeId;
    }
  | {
      type: 'reorderNode';
      nodeId: NodeId;
      action: NodeOrderAction;
    }
  | {
      type: 'setContainerChildBoundary';
      containerId: NodeId;
      childBoundary: ContainerChildBoundary;
    };

/**
 * Lightweight, JSON-schema-ish description of a single AI-exposed tool
 * (query or mutation). This is v1 scaffolding, not a full JSON Schema
 * validator — `parameters` is intentionally loose.
 */
export type AiToolDefinition = {
  name: string;
  description: string;
  kind: 'query' | 'mutation';
  parameters: Record<string, unknown>;
};

/**
 * Placeholder result shape for routing a single tool call. Query tools
 * will populate `data` with their projection result; mutation tools are
 * expected to be staged as drafts rather than applied (see Task 7's
 * `routeToolCall`). This shape is expected to be refined once the tool
 * router lands.
 */
export type AiToolResult = {
  toolName: string;
  kind: 'query' | 'mutation';
  data?: unknown;
};
