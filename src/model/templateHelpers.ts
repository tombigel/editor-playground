import type {
  BoxPadding,
  DocumentNode,
  ImageLeaf,
  ImageNodeConfig,
  LinkLeaf,
  LinkNodeConfig,
  NodeId,
  StickyDefinition,
  TemplateBuild,
  TemplateNode,
  TextLeaf,
  TextNodeConfig,
  WrapperNode,
} from './types';
import { createDefaultRect, createLeaf, createWrapper } from './defaultFactories';
import { parseFontSizeValue, parseSpacingValue, parseUnitValue } from './units';

export function applyPadding(
  node: Pick<WrapperNode, 'style'>,
  { top, right, bottom, left = right }: BoxPadding,
) {
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
  const section = createWrapper('section', parentId);
  section.name = name;
  section.rect = createDefaultRect('0px', '0px', '100%', height);
  applyPadding(section, padding);
  return section;
}

export function setChildren(parent: Pick<WrapperNode, 'children'>, children: TemplateNode[]) {
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
  wrapper: WrapperNode,
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

export function createTextNode(parentId: NodeId, config: TextNodeConfig) {
  const text = createLeaf('text', parentId) as TextLeaf;
  text.name = config.name;
  text.content = config.content;
  text.rect = createDefaultRect(config.x, config.y, config.width, config.height ?? 'auto');
  if (config.style) {
    styleText(text, config.style);
  }
  return text;
}

export function createLinkNode(parentId: NodeId, config: LinkNodeConfig) {
  const link = createLeaf('link', parentId) as LinkLeaf;
  link.name = config.name;
  link.label = config.label;
  link.linkType = config.linkType ?? link.linkType;
  link.anchorTargetId = config.anchorTargetId ?? link.anchorTargetId;
  link.href = config.href ?? link.href;
  link.rect = createDefaultRect(config.x, config.y, config.width, config.height ?? 'auto');
  return link;
}

export function createImageNode(parentId: NodeId, config: ImageNodeConfig) {
  const image = createLeaf('image', parentId) as ImageLeaf;
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
  leaf: TextLeaf,
  options: {
    color?: string;
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: number;
    lineHeight?: number;
    htmlTag?: TextLeaf['htmlTag'];
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
