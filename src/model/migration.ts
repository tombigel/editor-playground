/**
 * migration.ts — RI-32 Phase 1
 *
 * Converts persisted documents from the old `type`/`role` discriminator model
 * to the new `contentType`/`subtype` model.
 *
 * This function is intentionally lenient: it accepts `unknown` input and returns
 * a best-effort `DocumentModel`. Callers should validate the result with
 * `validateDocument` before trusting it.
 *
 * Design principles:
 * - Pure function: no side-effects, no mutation of the input.
 * - Idempotent: running it on an already-migrated document is a no-op.
 * - Each node is migrated in isolation; invalid nodes are dropped.
 */

import type {
  BaseNode,
  ContainerNode,
  ContainerSubtype,
  DocumentModel,
  DocumentNode,
  FontLibrary,
  LinkExtension,
  MediaNode,
  NodeId,
  SiteNode,
  TextNode,
} from './types';
import {
  createCodeBlockContent,
  createTextBlockContent,
  createTextDocumentContent,
  isTextDocumentContent,
  listContentToRichListBlock,
  normalizeTextDocumentContent,
} from './richContent';
import { normalizeListContent } from './listContent';

// ---------------------------------------------------------------------------
// Internal raw-input shapes — mirrors the old persisted format
// ---------------------------------------------------------------------------

type RawNode = Record<string, unknown>;
type RawDocument = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function extractBaseNode(raw: RawNode): BaseNode {
  return {
    id: asString(raw.id),
    parentId: typeof raw.parentId === 'string' ? raw.parentId : null,
    children: asStringArray(raw.children),
    name: asString(raw.name, 'Unnamed'),
    visible: asBool(raw.visible, true),
    locked: asBool(raw.locked, false),
  };
}

/** Build a LinkExtension from old link/button fields scattered directly on the node. */
function extractLegacyLinkExtension(raw: RawNode): LinkExtension | undefined {
  const linkType = asString(raw.linkType);
  if (!linkType && !raw.href && !raw.anchorTargetId) {
    return undefined;
  }
  const normalizedLinkType =
    linkType === 'external' || linkType === 'page' || linkType === 'anchor'
      ? linkType
      : 'external';
  return {
    linkType: normalizedLinkType,
    href: typeof raw.href === 'string' ? raw.href : undefined,
    openInNewTab: typeof raw.openInNewTab === 'boolean' ? raw.openInNewTab : undefined,
    targetPageId: typeof raw.targetPageId === 'string' ? raw.targetPageId : undefined,
    pageAnchorId: typeof raw.pageAnchorId === 'string' ? raw.pageAnchorId : undefined,
    anchorTargetId: typeof raw.anchorTargetId === 'string' ? raw.anchorTargetId : undefined,
  };
}

// ---------------------------------------------------------------------------
// Per-type node migration
// ---------------------------------------------------------------------------

function migrateSiteNode(raw: RawNode): SiteNode {
  const base = extractBaseNode(raw);
  return {
    ...base,
    contentType: 'site',
    type: 'site',
    ...(typeof raw.stickyElevation === 'boolean' ? { stickyElevation: raw.stickyElevation } : {}),
  };
}

function migrateWrapperNode(raw: RawNode): ContainerNode | null {
  const role = asString(raw.role);
  const validSubtypes: ContainerSubtype[] = ['section', 'header', 'footer', 'container', 'group', 'nav', 'aside', 'article'];
  const subtype: ContainerSubtype = validSubtypes.includes(role as ContainerSubtype)
    ? (role as ContainerSubtype)
    : 'section';

  if (!isObject(raw.rect)) {
    return null;
  }

  const base = extractBaseNode(raw);
  const node: ContainerNode = {
    ...base,
    contentType: 'container',
    subtype,
    rect: raw.rect as ContainerNode['rect'],
    ...(isObject(raw.sticky) ? { sticky: raw.sticky as ContainerNode['sticky'] } : {}),
    ...(isObject(raw.animation) ? { animation: raw.animation as ContainerNode['animation'] } : {}),
    ...(Array.isArray(raw.pageTargetIds) ? { pageTargetIds: asStringArray(raw.pageTargetIds) } : {}),
    ...(typeof raw.ariaLabel === 'string' && raw.ariaLabel.trim() ? { ariaLabel: raw.ariaLabel.trim() } : {}),
    ...(isObject(raw.style) ? { style: raw.style as ContainerNode['style'] } : { style: {} as ContainerNode['style'] }),
  };

  // Ensure style is always defined (WrapperNode always had style)
  if (!node.style) {
    node.style = {} as ContainerNode['style'];
  }

  return node;
}

function migrateTextLeaf(raw: RawNode): TextNode | null {
  if (!isObject(raw.rect)) {
    return null;
  }

  const base = extractBaseNode(raw);
  const htmlTag =
    raw.htmlTag === 'blockquote'
      ? 'blockquote'
      : raw.htmlTag === 'h1' ||
          raw.htmlTag === 'h2' ||
          raw.htmlTag === 'h3' ||
          raw.htmlTag === 'h4' ||
          raw.htmlTag === 'h5' ||
          raw.htmlTag === 'h6'
        ? raw.htmlTag
        : 'p';
  return {
    ...base,
    contentType: 'text',
    subtype: 'block',
    content: createTextDocumentContent([
      createTextBlockContent(
        htmlTag === 'blockquote' ? 'blockquote' : htmlTag === 'p' ? 'paragraph' : htmlTag,
        asString(raw.content, ''),
        { direction: 'ltr' },
      ),
    ]),
    htmlTag,
    ...(typeof raw.lang === 'string' ? { lang: raw.lang } : {}),
    rect: raw.rect as TextNode['rect'],
    ...(isObject(raw.sticky) ? { sticky: raw.sticky as TextNode['sticky'] } : {}),
    ...(isObject(raw.animation) ? { animation: raw.animation as TextNode['animation'] } : {}),
    ...(isObject(raw.style) ? { style: raw.style as TextNode['style'] } : {}),
  };
}

function migrateImageLeaf(raw: RawNode): MediaNode | null {
  if (!isObject(raw.rect)) {
    return null;
  }

  const base = extractBaseNode(raw);
  return {
    ...base,
    contentType: 'media',
    subtype: 'image',
    ...(typeof raw.src === 'string' ? { src: raw.src } : {}),
    ...(typeof raw.alt === 'string' ? { alt: raw.alt } : {}),
    rect: raw.rect as MediaNode['rect'],
    ...(isObject(raw.sticky) ? { sticky: raw.sticky as MediaNode['sticky'] } : {}),
    ...(isObject(raw.animation) ? { animation: raw.animation as MediaNode['animation'] } : {}),
    ...(isObject(raw.style) ? { style: raw.style as MediaNode['style'] } : {}),
  };
}

/**
 * Old `link` role → TextNode (block subtype) with LinkExtension.
 * The `label` field on the old node becomes the `content` field.
 */
function migrateLinkLeaf(raw: RawNode): TextNode | null {
  if (!isObject(raw.rect)) {
    return null;
  }

  const base = extractBaseNode(raw);
  const link = extractLegacyLinkExtension(raw);
  const content = asString(raw.label, asString(raw.content, 'Read more'));

  return {
    ...base,
    contentType: 'text',
    subtype: 'block',
    content: createTextDocumentContent([
      createTextBlockContent('paragraph', content, { direction: 'ltr' }),
    ]),
    htmlTag: 'p',
    ...(link ? { link } : {}),
    rect: raw.rect as TextNode['rect'],
    ...(isObject(raw.sticky) ? { sticky: raw.sticky as TextNode['sticky'] } : {}),
    ...(isObject(raw.animation) ? { animation: raw.animation as TextNode['animation'] } : {}),
    ...(isObject(raw.style) ? { style: raw.style as TextNode['style'] } : {}),
  };
}

/**
 * Old `button` role → TextNode (block subtype) with LinkExtension + button style.
 * The `label` field on the old node becomes the `content` field.
 */
function migrateButtonLeaf(raw: RawNode): TextNode | null {
  if (!isObject(raw.rect)) {
    return null;
  }

  const base = extractBaseNode(raw);
  const link = extractLegacyLinkExtension(raw) ?? {
    linkType: 'external' as const,
    href: '#',
  };
  const content = asString(raw.label, asString(raw.content, 'Button'));

  return {
    ...base,
    contentType: 'text',
    subtype: 'block',
    content: createTextDocumentContent([
      createTextBlockContent('paragraph', content, { direction: 'ltr' }),
    ]),
    htmlTag: 'p',
    link,
    rect: raw.rect as TextNode['rect'],
    ...(isObject(raw.sticky) ? { sticky: raw.sticky as TextNode['sticky'] } : {}),
    ...(isObject(raw.animation) ? { animation: raw.animation as TextNode['animation'] } : {}),
    // Button style lives on the `style` field — carry it over verbatim.
    ...(isObject(raw.style) ? { style: raw.style as TextNode['style'] } : {}),
  };
}

/**
 * Migrate a node that is already in the new `contentType`/`subtype` format.
 * Returns the node as-is (shallow copy). This makes the function idempotent.
 */
function migrateNewFormatNode(raw: RawNode): DocumentNode | null {
  const ct = raw.contentType;
  if (ct === 'site' || ct === 'container' || ct === 'text' || ct === 'media') {
    const node = structuredClone(raw) as unknown as DocumentNode;
    if (node.contentType === 'text') {
      const rawContent = (node as unknown as { content: unknown }).content;
      if (node.subtype === 'rich') {
        node.content = normalizeTextDocumentContent(rawContent);
        delete node.htmlTag;
      } else if (isTextDocumentContent(rawContent)) {
        // Content is already in the canonical TextDocumentContent shape
        // (block/code/list node migrated on a previous pass) — coercing it
        // through the transitional string/list branches below would wipe it.
        node.content = normalizeTextDocumentContent(rawContent);
      } else if (node.subtype === 'code') {
        const codeText = typeof rawContent === 'string' ? rawContent : '';
        node.content = normalizeTextDocumentContent(createTextDocumentContent([
          createCodeBlockContent(codeText, {
            direction: 'ltr',
            language: node.code?.language,
            theme: node.code?.theme,
            highlightedHtml: node.code?.highlightedHtml,
          }),
        ]));
      } else if (node.subtype === 'list') {
        node.content = normalizeTextDocumentContent(createTextDocumentContent([
          listContentToRichListBlock(normalizeListContent(rawContent), { direction: 'ltr' }),
        ]));
      } else {
        const blockText = typeof rawContent === 'string' ? rawContent : '';
        node.content = normalizeTextDocumentContent(createTextDocumentContent([
          createTextBlockContent(
            node.htmlTag === 'blockquote' ? 'blockquote' : node.htmlTag && node.htmlTag !== 'p' ? node.htmlTag : 'paragraph',
            blockText,
            { direction: 'ltr' },
          ),
        ]));
      }
    }
    return node;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Node dispatcher
// ---------------------------------------------------------------------------

function migrateNode(raw: RawNode): DocumentNode | null {
  // Try new format first (idempotent path)
  const newFormat = migrateNewFormatNode(raw);
  if (newFormat !== null) {
    return newFormat;
  }

  const type = asString(raw.type);
  const role = asString(raw.role);

  if (type === 'site') {
    return migrateSiteNode(raw);
  }

  if (type === 'wrapper') {
    return migrateWrapperNode(raw);
  }

  if (type === 'leaf') {
    switch (role) {
      case 'text':
        return migrateTextLeaf(raw);
      case 'image':
        return migrateImageLeaf(raw);
      case 'link':
        return migrateLinkLeaf(raw);
      case 'button':
        return migrateButtonLeaf(raw);
      default:
        // Unknown leaf role — attempt best-effort text migration
        return migrateTextLeaf(raw);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Document migration entry point
// ---------------------------------------------------------------------------

/**
 * Migrate a raw (possibly old-format) persisted document into the current
 * `contentType`/`subtype` DocumentModel shape.
 *
 * - Safe to call on already-migrated documents (idempotent).
 * - Drops nodes that cannot be migrated (missing id, rect, etc.).
 * - Call `validateDocument` on the result before trusting it.
 */
export function migrateDocumentModel(raw: unknown): DocumentModel {
  if (!isObject(raw)) {
    throw new Error(`migrateDocumentModel: expected an object, got ${typeof raw}`);
  }

  const rawDoc = raw as RawDocument;
  const rootId = asString(rawDoc.rootId);

  if (!rootId) {
    throw new Error('migrateDocumentModel: document is missing rootId');
  }

  const rawNodes = isObject(rawDoc.nodes) ? rawDoc.nodes : {};
  // Null prototype: node ids come from untrusted JSON, and a key like
  // "__proto__" must become an own entry, not a prototype assignment.
  const migratedNodes: Record<NodeId, DocumentNode> = Object.create(null);

  for (const [id, rawNode] of Object.entries(rawNodes)) {
    if (!isObject(rawNode)) {
      continue;
    }
    const migrated = migrateNode(rawNode);
    if (migrated !== null) {
      // Ensure the key matches the node's declared id
      const nodeId = asString(migrated.id) || id;
      migrated.id = nodeId;
      migratedNodes[nodeId] = migrated;
    }
  }

  // Carry over font library or provide a safe empty default
  const fontLibrary: FontLibrary = isObject(rawDoc.fontLibrary)
    ? (rawDoc.fontLibrary as FontLibrary)
    : { defaults: [], favorites: [], usedFamilies: [] };

  const result: DocumentModel = {
    rootId,
    nodes: migratedNodes,
    fontLibrary,
  };

  if (isObject(rawDoc.animationSettings)) {
    result.animationSettings = rawDoc.animationSettings as DocumentModel['animationSettings'];
  }

  if (Array.isArray(rawDoc.pages)) {
    result.pages = rawDoc.pages as DocumentModel['pages'];
  }

  if (isObject(rawDoc.siteSettings)) {
    result.siteSettings = rawDoc.siteSettings as DocumentModel['siteSettings'];
  }

  if (Array.isArray(rawDoc.sharedRegionIds)) {
    result.sharedRegionIds = asStringArray(rawDoc.sharedRegionIds);
  }

  return result;
}
