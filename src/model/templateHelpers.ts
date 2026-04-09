import type {
  BoxPadding,
  ContainerNode,
  DocumentNode,
  ImageNodeConfig,
  LinkNodeConfig,
  MediaNode,
  NodeId,
  StickyDefinition,
  TemplateBuild,
  TemplateNode,
  TextNode,
  TextNodeConfig,
} from './types';
import { createContainerNode, createDefaultRect, createLinkTextNode, createMediaNode, createTextNode as createTextNodeFactory } from './defaultFactories';
import { createTextBlockContent, createTextDocumentContent } from './richContent';
import { parseFontSizeValue, parseSpacingValue, parseUnitValue } from './units';

export function applyPadding(
  node: Pick<ContainerNode, 'style'>,
  { top, right, bottom, left = right }: BoxPadding,
) {
  node.style ??= {};
  node.style.paddingTop = parseSpacingValue(top);
  node.style.paddingRight = parseSpacingValue(right);
  node.style.paddingBottom = parseSpacingValue(bottom);
  node.style.paddingLeft = parseSpacingValue(left);
}

export function createTemplateSection(
  parentId: NodeId,
  name: string,
  height: string,
  padding: BoxPadding,
) {
  const section = createContainerNode('section', parentId);
  section.name = name;
  section.rect = createDefaultRect('0px', '0px', '100%', height);
  applyPadding(section, padding);
  return section;
}

export function setChildren(parent: Pick<ContainerNode, 'children'>, children: TemplateNode[]) {
  parent.children = children.map((child) => child.id);
}

export function createNodeMap(...nodes: TemplateNode[]) {
  return Object.fromEntries(nodes.map((node) => [node.id, node])) as Record<NodeId, DocumentNode>;
}

export function addTemplateNodes(nodeMap: Record<NodeId, DocumentNode>, ...nodes: TemplateNode[]) {
  for (const node of nodes) {
    nodeMap[node.id] = node;
  }
}

export function buildTemplate(
  wrapper: ContainerNode,
  children: TemplateNode[] = [],
  extraNodes: TemplateNode[] = [],
): TemplateBuild {
  if (children.length > 0) {
    setChildren(wrapper, children);
  }

  return {
    wrapper,
    nodes: createNodeMap(wrapper, ...children, ...extraNodes),
  };
}

export function createTextNode(parentId: NodeId, config: TextNodeConfig): TextNode {
  const text = createTextNodeFactory('block', parentId);
  text.name = config.name;
  text.content = createTextDocumentContent([
    createTextBlockContent(
      config.style?.htmlTag === 'blockquote'
        ? 'blockquote'
        : config.style?.htmlTag && config.style.htmlTag !== 'p'
          ? config.style.htmlTag
          : 'paragraph',
      config.content,
      { direction: 'ltr' },
    ),
  ]);
  text.rect = createDefaultRect(config.x, config.y, config.width, config.height ?? 'auto');
  if (config.style) {
    styleText(text, config.style);
  }
  return text;
}

export function createLinkNode(parentId: NodeId, config: LinkNodeConfig): TextNode {
  const link = createLinkTextNode(parentId);
  link.name = config.name;
  link.content = createTextDocumentContent([
    createTextBlockContent('paragraph', config.label, { direction: 'ltr' }),
  ]);
  link.link = {
    ...link.link,
    linkType: config.linkType ?? link.link?.linkType ?? 'anchor',
    anchorTargetId: config.anchorTargetId ?? link.link?.anchorTargetId,
    href: config.href ?? link.link?.href ?? '#',
  };
  link.rect = createDefaultRect(config.x, config.y, config.width, config.height ?? 'auto');
  return link;
}

export function createImageNode(parentId: NodeId, config: ImageNodeConfig): MediaNode {
  const image = createMediaNode('image', parentId);
  image.name = config.name;
  image.rect = createDefaultRect(config.x, config.y, config.width, config.height ?? 'auto');
  if (config.src) {
    image.src = config.src;
  }
  if (config.alt) {
    image.alt = config.alt;
  }
  if (config.sticky) {
    image.sticky = config.sticky;
  }
  return image;
}

export function styleText(
  leaf: TextNode,
  options: {
    color?: string;
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: number;
    lineHeight?: number;
    htmlTag?: TextNode['htmlTag'];
  },
) {
  leaf.style ??= {};
  if (options.color) {
    leaf.style.color = options.color;
  }
  if (options.fontFamily) {
    leaf.style.fontFamily = options.fontFamily;
  }
  if (options.fontSize) {
    leaf.style.fontSize = parseFontSizeValue(options.fontSize);
  }
  if (options.fontWeight) {
    leaf.style.fontWeight = options.fontWeight;
  }
  if (typeof options.lineHeight === 'number') {
    leaf.style.lineHeight = options.lineHeight;
  }
  if (options.htmlTag) {
    leaf.htmlTag = options.htmlTag;
    const firstBlock = leaf.content.blocks[0];
    if (firstBlock && firstBlock.type !== 'code-block' && firstBlock.type !== 'ul' && firstBlock.type !== 'ol') {
      firstBlock.type = options.htmlTag === 'blockquote'
        ? 'blockquote'
        : options.htmlTag === 'p'
          ? 'paragraph'
          : options.htmlTag;
    }
  }
}

export function createTopSticky({
  duration,
  offsetTop,
  durationMode = 'custom',
}: {
  duration: string;
  offsetTop: string;
  durationMode?: 'auto' | 'custom';
}): StickyDefinition {
  return {
    enabled: true,
    target: 'self',
    edges: { top: true, bottom: false },
    durationMode,
    duration: parseUnitValue(duration),
    durationTop: parseUnitValue(duration),
    durationBottom: parseUnitValue(duration),
    offsetTop: parseUnitValue(offsetTop),
  };
}

export function createBottomSticky({
  durationBottom,
  offsetBottom,
}: {
  durationBottom: string;
  offsetBottom: string;
}): StickyDefinition {
  return {
    enabled: true,
    target: 'self',
    edges: { top: false, bottom: true },
    durationMode: 'custom',
    duration: parseUnitValue(durationBottom),
    durationTop: parseUnitValue(durationBottom),
    durationBottom: parseUnitValue(durationBottom),
    offsetBottom: parseUnitValue(offsetBottom),
  };
}

export function createBothSticky({
  duration,
  durationTop,
  durationBottom,
  offsetTop,
  offsetBottom,
}: {
  duration: string;
  durationTop: string;
  durationBottom: string;
  offsetTop: string;
  offsetBottom: string;
}): StickyDefinition {
  return {
    enabled: true,
    target: 'self',
    edges: { top: true, bottom: true },
    durationMode: 'custom',
    duration: parseUnitValue(duration),
    durationTop: parseUnitValue(durationTop),
    durationBottom: parseUnitValue(durationBottom),
    offsetTop: parseUnitValue(offsetTop),
    offsetBottom: parseUnitValue(offsetBottom),
  };
}
