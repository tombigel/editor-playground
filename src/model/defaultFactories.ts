import type {
  ContainerNode,
  ContainerSubtype,
  DocumentModel,
  MediaNode,
  MediaSubtype,
  NodeId,
  StickyDefinition,
  TextNode,
  TextSubtype,
} from './types';
import {
  DEFAULT_BUTTON_BACKGROUND,
  DEFAULT_BUTTON_BORDER_RADIUS,
  DEFAULT_BUTTON_PADDING_BLOCK,
  DEFAULT_BUTTON_PADDING_INLINE,
  DEFAULT_BUTTON_SHADOW_BLUR_PX,
  DEFAULT_BUTTON_SHADOW_COLOR,
  DEFAULT_BUTTON_SHADOW_OFFSET_X_PX,
  DEFAULT_BUTTON_SHADOW_OFFSET_Y_PX,
  DEFAULT_BUTTON_TEXT_COLOR,
  DEFAULT_IMAGE_BORDER_COLOR,
  DEFAULT_IMAGE_BORDER_RADIUS,
  DEFAULT_IMAGE_BORDER_WIDTH,
  DEFAULT_IMAGE_SHADOW_BLUR_PX,
  DEFAULT_IMAGE_SHADOW_COLOR,
  DEFAULT_IMAGE_SHADOW_OFFSET_X_PX,
  DEFAULT_IMAGE_SHADOW_OFFSET_Y_PX,
  DEFAULT_LINK_COLOR,
  DEFAULT_TEXT_COLOR,
} from './styleDefaults';
import { parseFontSizeValue, parseHeightValue, parseSpacingValue, parseUnitValue, parseWidthValue } from './units';
import { TEXT_NODE_DEFAULTS } from './textNodeDefaults';

let counter = 0;
let imageCounter = 0;

const IMAGE_SOURCES = [
  {
    src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    alt: 'Golden desert dunes under soft sunlight',
  },
  {
    src: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80',
    alt: 'Mist rising over a calm mountain lake',
  },
  {
    src: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    alt: 'Modern interior with natural light and textured seating',
  },
];

export function nextId(prefix: string): NodeId {
  counter += 1;
  return `${prefix}_${counter}`;
}

export function syncIdCountersWithDocument(document: DocumentModel) {
  let maxIdCounter = counter;
  let imageCount = 0;

  for (const node of Object.values(document.nodes)) {
    const match = node.id.match(/_(\d+)$/);
    if (match) {
      const value = Number.parseInt(match[1], 10);
      if (Number.isFinite(value)) {
        maxIdCounter = Math.max(maxIdCounter, value);
      }
    }
    if (node.contentType === 'media' && node.subtype === 'image') {
      imageCount += 1;
    }
  }

  counter = Math.max(counter, maxIdCounter);
  imageCounter = Math.max(imageCounter, imageCount);
}

export function createDefaultSticky(): StickyDefinition {
  return {
    enabled: true,
    target: 'self',
    edges: { top: true, bottom: false },
    duration: parseUnitValue('50vh'),
    durationTop: parseUnitValue('50vh'),
    durationBottom: parseUnitValue('50vh'),
  };
}

export function createDefaultRect(x = '24px', y = '24px', width = '240px', height = '80px') {
  return {
    x: { base: parseUnitValue(x) },
    y: { base: parseUnitValue(y) },
    width: { base: parseWidthValue(width) },
    height: { base: parseHeightValue(height) },
  };
}

// ---------------------------------------------------------------------------
// New factory functions (Phase 1)
// ---------------------------------------------------------------------------

/**
 * Create a ContainerNode with sensible defaults for the given subtype.
 * Replaces the old `createWrapper(role, parentId)`.
 */
export function createContainerNode(subtype: ContainerSubtype, parentId: NodeId): ContainerNode {
  const name = subtype[0].toUpperCase() + subtype.slice(1);
  return {
    id: nextId(subtype),
    contentType: 'container',
    subtype,
    parentId,
    children: [],
    name,
    visible: true,
    locked: false,
    rect:
      subtype === 'container' || subtype === 'group'
        ? createDefaultRect('48px', '48px', '360px', '240px')
        : createDefaultRect('0px', '0px', '100%', '480px'),
    style: {
      background: '#ffffff',
      paddingTop: parseSpacingValue('16px'),
      paddingRight: parseSpacingValue('16px'),
      paddingBottom: parseSpacingValue('16px'),
      paddingLeft: parseSpacingValue('16px'),
      ...(subtype === 'container' || subtype === 'group'
        ? {
            borderColor: DEFAULT_IMAGE_BORDER_COLOR,
            borderWidth: parseUnitValue(DEFAULT_IMAGE_BORDER_WIDTH),
            borderRadius: parseUnitValue(DEFAULT_IMAGE_BORDER_RADIUS),
          }
        : {}),
    },
  };
}

/**
 * Create a TextNode with sensible defaults for the given subtype.
 *
 * - 'block' → plain paragraph text (was `role: 'text'`)
 * - 'rich'  → rich text block
 * - 'code'  → code block
 *
 * To create the old `link` role, call `createTextNode('block', parentId)` and
 * set the returned node's `link` field.
 * To create the old `button` role, call `createTextNode('block', parentId)` and
 * set `link` plus button style presets (see `createButtonTextNode`).
 */
export function createTextNode(subtype: TextSubtype, parentId: NodeId): TextNode {
  const id = nextId(subtype === 'block' ? 'text' : subtype);

  if (subtype === 'code') {
    return {
      id,
      contentType: 'text',
      subtype: 'code',
      parentId,
      children: [],
      name: 'Code',
      visible: true,
      locked: false,
      rect: createDefaultRect('32px', '32px', '320px', 'auto'),
      content: TEXT_NODE_DEFAULTS.code.content,
      code: { language: TEXT_NODE_DEFAULTS.code.language, theme: TEXT_NODE_DEFAULTS.code.theme },
      style: {
        color: DEFAULT_TEXT_COLOR,
        ...TEXT_NODE_DEFAULTS.code.style,
        direction: 'ltr',
        textAlign: 'left',
      },
    };
  }

  if (subtype === 'rich') {
    return {
      id,
      contentType: 'text',
      subtype: 'rich',
      parentId,
      children: [],
      name: 'Rich Text',
      visible: true,
      locked: false,
      rect: createDefaultRect('32px', '32px', '320px', 'auto'),
      content: TEXT_NODE_DEFAULTS.rich.content,
      style: {
        color: DEFAULT_TEXT_COLOR,
        fontFamily: 'Inter',
        ...TEXT_NODE_DEFAULTS.rich.style,
        direction: 'ltr',
        textAlign: 'left',
      },
    };
  }

  // Default: block
  return {
    id,
    contentType: 'text',
    subtype: 'block',
    parentId,
    children: [],
    name: 'Text',
    visible: true,
    locked: false,
    rect: createDefaultRect('32px', '32px', 'fit-content', 'auto'),
    content: TEXT_NODE_DEFAULTS.paragraph.content,
    htmlTag: 'p',
    sticky: undefined,
    style: {
      color: DEFAULT_TEXT_COLOR,
      fontFamily: 'Inter',
      ...TEXT_NODE_DEFAULTS.paragraph.style,
      textDecorationLine: 'none',
      direction: 'ltr',
      textAlign: 'left',
    },
  };
}

/**
 * Create a TextNode pre-configured as a link (equivalent to old `role: 'link'`).
 */
export function createLinkTextNode(parentId: NodeId): TextNode {
  const base = createTextNode('block', parentId);
  return {
    ...base,
    name: 'Link',
    rect: createDefaultRect('32px', '32px', 'fit-content', 'auto'),
    content: 'Read more',
    link: {
      linkType: 'anchor',
      href: '#',
    },
    style: {
      color: DEFAULT_LINK_COLOR,
      fontFamily: 'Inter',
      fontSize: parseFontSizeValue('16px'),
      fontWeight: 600,
      textDecorationLine: 'underline',
      lineHeight: 1.35,
      direction: 'ltr',
      textAlign: 'left',
      textWrap: 'single-line',
    },
  };
}

/**
 * Create a TextNode pre-configured as a button (equivalent to old `role: 'button'`).
 */
export function createButtonTextNode(parentId: NodeId): TextNode {
  const base = createTextNode('block', parentId);
  return {
    ...base,
    name: 'Button',
    rect: createDefaultRect('32px', '32px', 'fit-content', 'auto'),
    content: 'Button',
    link: {
      linkType: 'external',
      href: '#',
    },
    style: {
      color: DEFAULT_BUTTON_TEXT_COLOR,
      background: DEFAULT_BUTTON_BACKGROUND,
      fontFamily: 'Inter',
      fontSize: parseFontSizeValue('16px'),
      fontWeight: 600,
      textDecorationLine: 'none',
      lineHeight: 1.15,
      direction: 'ltr',
      textAlign: 'left',
      textWrap: 'single-line',
      paddingBlock: parseSpacingValue(DEFAULT_BUTTON_PADDING_BLOCK),
      paddingInline: parseSpacingValue(DEFAULT_BUTTON_PADDING_INLINE),
      borderRadius: parseUnitValue(DEFAULT_BUTTON_BORDER_RADIUS),
      shadowColor: DEFAULT_BUTTON_SHADOW_COLOR,
      shadowBlur: DEFAULT_BUTTON_SHADOW_BLUR_PX,
      shadowOffsetX: DEFAULT_BUTTON_SHADOW_OFFSET_X_PX,
      shadowOffsetY: DEFAULT_BUTTON_SHADOW_OFFSET_Y_PX,
    },
  };
}

/**
 * Create a MediaNode with sensible defaults for the given subtype.
 * Replaces the old `createLeaf('image', parentId)` for image nodes.
 */
export function createMediaNode(subtype: MediaSubtype, parentId: NodeId): MediaNode {
  if (subtype === 'image') {
    const image = IMAGE_SOURCES[imageCounter % IMAGE_SOURCES.length];
    imageCounter += 1;
    return {
      id: nextId('image'),
      contentType: 'media',
      subtype: 'image',
      parentId,
      children: [],
      name: 'Image',
      visible: true,
      locked: false,
      rect: createDefaultRect('32px', '32px', '320px', 'aspect-ratio(4/3)'),
      src: image.src,
      alt: image.alt,
      sticky: undefined,
      style: {
        borderWidth: parseUnitValue(DEFAULT_IMAGE_BORDER_WIDTH),
        borderColor: DEFAULT_IMAGE_BORDER_COLOR,
        borderRadius: parseUnitValue(DEFAULT_IMAGE_BORDER_RADIUS),
        shadowColor: DEFAULT_IMAGE_SHADOW_COLOR,
        shadowBlur: DEFAULT_IMAGE_SHADOW_BLUR_PX,
        shadowOffsetX: DEFAULT_IMAGE_SHADOW_OFFSET_X_PX,
        shadowOffsetY: DEFAULT_IMAGE_SHADOW_OFFSET_Y_PX,
      },
    };
  }

  if (subtype === 'video') {
    return {
      id: nextId('video'),
      contentType: 'media',
      subtype: 'video',
      parentId,
      children: [],
      name: 'Video',
      visible: true,
      locked: false,
      rect: createDefaultRect('32px', '32px', '320px', 'aspect-ratio(4/3)' as string),
      video: { autoplay: false, loop: false, muted: true },
      style: {},
    };
  }

  if (subtype === 'svg') {
    return {
      id: nextId('svg'),
      contentType: 'media',
      subtype: 'svg',
      parentId,
      children: [],
      name: 'SVG',
      visible: true,
      locked: false,
      rect: createDefaultRect('32px', '32px', '120px', '120px'),
      svg: { renderMode: 'img' },
      style: {},
    };
  }

  // embed
  return {
    id: nextId('embed'),
    contentType: 'media',
    subtype: 'embed',
    parentId,
    children: [],
    name: 'Embed',
    visible: true,
    locked: false,
    rect: createDefaultRect('32px', '32px', '320px', '200px'),
    style: {},
  };
}

