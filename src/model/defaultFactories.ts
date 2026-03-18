import type {
  ButtonLeaf,
  DocumentModel,
  ImageLeaf,
  LinkLeaf,
  NodeId,
  StickyDefinition,
  TextLeaf,
  WrapperNode,
  WrapperRole,
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
    if (node.type === 'leaf' && node.role === 'image') {
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

export function createWrapper(role: WrapperRole, parentId: NodeId): WrapperNode {
  const name = role[0].toUpperCase() + role.slice(1);
  return {
    id: nextId(role),
    type: 'wrapper',
    role,
    parentId,
    children: [],
    name,
    visible: true,
    locked: false,
    rect:
      role === 'container'
        ? createDefaultRect('48px', '48px', '360px', '240px')
        : createDefaultRect('0px', '0px', '100%', '480px'),
    style: {
      background: '#ffffff',
      paddingTop: parseSpacingValue('16px'),
      paddingRight: parseSpacingValue('16px'),
      paddingBottom: parseSpacingValue('16px'),
      paddingLeft: parseSpacingValue('16px'),
    },
  };
}

export function createLeaf(
  role: 'text' | 'image' | 'link' | 'button',
  parentId: NodeId,
): TextLeaf | ImageLeaf | LinkLeaf | ButtonLeaf {
  const id = nextId(role);
  const base = {
    id,
    type: 'leaf' as const,
    parentId,
    children: [],
    visible: true,
    locked: false,
  };

  if (role === 'text') {
    return {
      ...base,
      role: 'text',
      name: 'Text',
      rect: createDefaultRect('32px', '32px', 'fit-content', 'auto'),
      content: 'Edit text',
      htmlTag: 'p',
      sticky: undefined,
      style: {
        color: DEFAULT_TEXT_COLOR,
        fontSize: parseFontSizeValue('18px'),
        textDecorationLine: 'none',
        lineHeight: 1.24,
        direction: 'ltr',
        textAlign: 'left',
      },
    };
  }

  if (role === 'image') {
    const image = IMAGE_SOURCES[imageCounter % IMAGE_SOURCES.length];
    imageCounter += 1;
    return {
      ...base,
      role: 'image',
      name: 'Image',
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

  if (role === 'link') {
    return {
      ...base,
      role: 'link',
      name: 'Link',
      rect: createDefaultRect('32px', '32px', 'fit-content', 'auto'),
      label: 'Read more',
      href: '#',
      sticky: undefined,
      style: {
        color: DEFAULT_LINK_COLOR,
        textDecorationLine: 'underline',
        lineHeight: 1.24,
        direction: 'ltr',
        textAlign: 'left',
        textWrap: 'single-line',
      },
    };
  }

  return {
    ...base,
    role: 'button',
    name: 'Button',
    rect: createDefaultRect('32px', '32px', 'fit-content', 'auto'),
    label: 'Button',
    sticky: undefined,
    style: {
      color: DEFAULT_BUTTON_TEXT_COLOR,
      background: DEFAULT_BUTTON_BACKGROUND,
      fontSize: parseFontSizeValue('18px'),
      textDecorationLine: 'none',
      lineHeight: 1.24,
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
