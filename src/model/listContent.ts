import type {
  DescriptionListItem,
  LinkExtension,
  LinkKind,
  ListContent,
  ListContentType,
  ListDirection,
  ListTextItem,
  OrderedListMarkerStyle,
  UnorderedListContent,
  UnorderedListMarkerStyle,
} from './types';
import { MAX_LIST_ITEM_DEPTH, normalizeListItemDepth } from './richContent/shared';

const UNORDERED_MARKER_STYLES = new Set<UnorderedListMarkerStyle>(['disc', 'circle', 'square']);
const ORDERED_MARKER_STYLES = new Set<OrderedListMarkerStyle>([
  'decimal',
  'lower-alpha',
  'upper-alpha',
  'lower-roman',
  'upper-roman',
]);
const LINK_KINDS = new Set<LinkKind>(['anchor', 'external', 'page']);

type UnknownRecord = Record<string, unknown>;

function isObjectRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeDirection(value: unknown): ListDirection {
  return value === 'rtl' ? 'rtl' : 'ltr';
}

function normalizeLinkExtension(value: unknown): LinkExtension | undefined {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  const linkType = LINK_KINDS.has(value.linkType as LinkKind)
    ? value.linkType as LinkKind
    : undefined;

  if (!linkType) {
    return undefined;
  }

  return {
    linkType,
    ...(typeof value.href === 'string' ? { href: value.href } : {}),
    ...(typeof value.openInNewTab === 'boolean' ? { openInNewTab: value.openInNewTab } : {}),
    ...(typeof value.targetPageId === 'string' ? { targetPageId: value.targetPageId } : {}),
    ...(typeof value.pageAnchorId === 'string' ? { pageAnchorId: value.pageAnchorId } : {}),
    ...(typeof value.anchorTargetId === 'string' ? { anchorTargetId: value.anchorTargetId } : {}),
  };
}

export function createListTextItem(
  text = '',
  overrides: Partial<ListTextItem> = {},
): ListTextItem {
  const depth = normalizeListItemDepth(overrides.depth);
  return {
    text,
    direction: normalizeDirection(overrides.direction),
    ...(depth ? { depth } : {}),
    ...(overrides.link ? { link: normalizeLinkExtension(overrides.link) } : {}),
  };
}

export function createDescriptionListItem(
  term = '',
  description = '',
  overrides: Partial<DescriptionListItem> = {},
): DescriptionListItem {
  return {
    term,
    description,
    direction: normalizeDirection(overrides.direction),
    ...(overrides.link ? { link: normalizeLinkExtension(overrides.link) } : {}),
  };
}

export function createDefaultListContent(): ListContent {
  return {
    type: 'ul',
    markerStyle: 'disc',
    items: [createListTextItem('List item')],
  };
}

function normalizeTextListItem(item: unknown, previousDepth: number): ListTextItem {
  if (!isObjectRecord(item)) {
    return createListTextItem('');
  }

  const depth = normalizeListItemDepth(item.depth, previousDepth);
  return {
    text: typeof item.text === 'string' ? item.text : '',
    direction: normalizeDirection(item.direction),
    ...(depth ? { depth } : {}),
    ...(normalizeLinkExtension(item.link) ? { link: normalizeLinkExtension(item.link) } : {}),
  };
}

function normalizeDescriptionListItem(item: unknown): DescriptionListItem {
  if (!isObjectRecord(item)) {
    return createDescriptionListItem('', '');
  }

  return {
    term: typeof item.term === 'string' ? item.term : '',
    description: typeof item.description === 'string' ? item.description : '',
    direction: normalizeDirection(item.direction),
    ...(normalizeLinkExtension(item.link) ? { link: normalizeLinkExtension(item.link) } : {}),
  };
}

function normalizeListType(value: unknown): ListContentType {
  return value === 'ol' || value === 'dl' ? value : 'ul';
}

function normalizeListTextItems(items: unknown): ListTextItem[] {
  if (!Array.isArray(items)) {
    return [createListTextItem('')];
  }

  const normalized: ListTextItem[] = [];
  let previousDepth = 0;
  for (const item of items) {
    const normalizedItem = normalizeTextListItem(item, previousDepth);
    previousDepth = normalizedItem.depth ?? 0;
    normalized.push(normalizedItem);
  }
  return normalized.length > 0 ? normalized : [createListTextItem('')];
}

function normalizeDescriptionListItems(items: unknown): DescriptionListItem[] {
  if (!Array.isArray(items)) {
    return [createDescriptionListItem('', '')];
  }

  const normalized = items.map((item) => normalizeDescriptionListItem(item));
  return normalized.length > 0 ? normalized : [createDescriptionListItem('', '')];
}

export function normalizeListContent(content: unknown): ListContent {
  if (!isObjectRecord(content)) {
    return createDefaultListContent();
  }

  const type = normalizeListType(content.type);
  if (type === 'dl') {
    return {
      type: 'dl',
      items: normalizeDescriptionListItems(content.items),
    };
  }

  if (type === 'ol') {
    return {
      type: 'ol',
      start: Number.isFinite(content.start) ? Math.max(1, Math.trunc(content.start as number)) : 1,
      markerStyle: ORDERED_MARKER_STYLES.has(content.markerStyle as OrderedListMarkerStyle)
        ? content.markerStyle as OrderedListMarkerStyle
        : 'decimal',
      items: normalizeListTextItems(content.items),
    };
  }

  return {
    type: 'ul',
    markerStyle: UNORDERED_MARKER_STYLES.has(content.markerStyle as UnorderedListMarkerStyle)
      ? content.markerStyle as UnorderedListMarkerStyle
      : 'disc',
    items: normalizeListTextItems(content.items),
  };
}

export function getListItemText(item: ListTextItem | DescriptionListItem): string {
  if ('text' in item) {
    return item.text;
  }

  if (item.term && item.description) {
    return `${item.term}: ${item.description}`;
  }

  return item.term || item.description;
}

export function getListTextContent(content: ListContent): string {
  return content.items.map((item) => getListItemText(item)).join('\n');
}

export function listContentToLines(content: ListContent): string[] {
  return content.items.map((item) => getListItemText(item));
}

export function listContentToMarkdown(content: ListContent): string {
  if (content.type === 'dl') {
    return content.items
      .map((item) => (item.term && item.description ? `${item.term}: ${item.description}` : item.term || item.description))
      .join('\n');
  }

  const start = content.type === 'ol' ? content.start ?? 1 : 1;
  return content.items
    .map((item, index) => {
      if (content.type === 'ol') {
        return `${start + index}. ${item.text}`;
      }
      return `- ${item.text}`;
    })
    .join('\n');
}

export function createUnorderedListContentFromLines(lines: string[]): UnorderedListContent {
  const normalizedLines = lines.length > 0 ? lines : [''];
  return {
    type: 'ul',
    markerStyle: 'disc',
    items: normalizedLines.map((line) => createListTextItem(line)),
  };
}

export function walkListLinks(content: ListContent, visitor: (link: LinkExtension) => void): void {
  for (const item of content.items) {
    if (item.link) {
      visitor(item.link);
    }
  }
}

export function validateListContentStructure(content: unknown): string[] {
  if (!isObjectRecord(content)) {
    return ['List content root must be an object.'];
  }

  const type = content.type;
  if (type !== 'ul' && type !== 'ol' && type !== 'dl') {
    return ['List content root type must be ul, ol, or dl.'];
  }

  if (!Array.isArray(content.items)) {
    return ['List content must define an items array.'];
  }

  const errors: string[] = [];
  let previousDepth = 0;
  content.items.forEach((item, index) => {
    if (!isObjectRecord(item)) {
      errors.push(`List item ${index} must be an object.`);
      return;
    }

    if (type === 'dl') {
      if (typeof item.term !== 'string') {
        errors.push(`Description list item ${index} must define a string term.`);
      }
      if (typeof item.description !== 'string') {
        errors.push(`Description list item ${index} must define a string description.`);
      }
    } else if (typeof item.text !== 'string') {
      errors.push(`List item ${index} must define a string text value.`);
    }

    if (item.direction !== undefined && item.direction !== 'ltr' && item.direction !== 'rtl') {
      errors.push(`List item ${index} direction must be ltr or rtl.`);
    }

    if (type !== 'dl' && item.depth !== undefined) {
      if (
        typeof item.depth !== 'number'
        || !Number.isFinite(item.depth)
        || Math.trunc(item.depth) !== item.depth
        || item.depth < 0
        || item.depth > MAX_LIST_ITEM_DEPTH
      ) {
        errors.push(`List item ${index} depth must be an integer from 0 to ${MAX_LIST_ITEM_DEPTH}.`);
      } else if (item.depth > previousDepth + 1) {
        errors.push(`List item ${index} depth cannot increase by more than one level.`);
      } else {
        previousDepth = item.depth;
      }
    } else if (type !== 'dl') {
      previousDepth = 0;
    }

    if (item.link !== undefined && normalizeLinkExtension(item.link) == null) {
      errors.push(`List item ${index} link must be a valid link object.`);
    }
  });

  return errors;
}
