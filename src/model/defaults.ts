import type {
  DocumentModel,
  DocumentNode,
  NodeId,
  StickyDefinition,
  WrapperNode,
  WrapperRole,
} from './types';
import { parseHeightValue, parseUnitValue, parseWidthValue } from './units';

let counter = 0;

export function nextId(prefix: string): NodeId {
  counter += 1;
  return `${prefix}_${counter}`;
}

export function createDefaultSticky(): StickyDefinition {
  return {
    enabled: true,
    target: 'self',
    edges: { top: true, bottom: false },
    duration: parseUnitValue('50vh'),
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
      borderColor: '#b6c2d1',
      borderWidth: parseUnitValue('1px'),
      paddingTop: parseUnitValue('16px'),
      paddingRight: parseUnitValue('16px'),
      paddingBottom: parseUnitValue('16px'),
      paddingLeft: parseUnitValue('16px'),
    },
  };
}

export function createLeaf(
  role: 'text' | 'image' | 'link' | 'button',
  parentId: NodeId,
): DocumentNode {
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
      sticky: undefined,
      style: {
        color: '#16202a',
        fontSize: parseUnitValue('18px'),
      },
    };
  }

  if (role === 'image') {
    return {
      ...base,
      role: 'image',
      name: 'Image',
      rect: createDefaultRect('32px', '32px', '240px', 'aspect-ratio(16/9)'),
      src: '',
      alt: 'Placeholder image',
      sticky: undefined,
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
    };
  }

  return {
    ...base,
    role: 'button',
    name: 'Button',
    rect: createDefaultRect('32px', '32px', 'fit-content', 'auto'),
    label: 'Button',
    sticky: undefined,
  };
}

export function createInitialDocument(): DocumentModel {
  const siteId = nextId('site');
  const section = createWrapper('section', siteId);
  const text = createLeaf('text', section.id);
  const button = createLeaf('button', section.id);
  section.children = [text.id, button.id];

  return {
    rootId: siteId,
    nodes: {
      [siteId]: {
        id: siteId,
        type: 'site',
        parentId: null,
        children: [section.id],
        name: 'Site',
        visible: true,
        locked: false,
      },
      [section.id]: section,
      [text.id]: text,
      [button.id]: button,
    },
  };
}
