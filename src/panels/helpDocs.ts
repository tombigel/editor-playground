import helpDocsManifest from './generated/helpDocsManifest.json';
import { HELP_DOC_REGISTRY, type HelpDocAlias, type HelpDocRegistryEntry } from './helpDocRegistry';

type HelpDocManifestEntry = {
  path: string;
  fileName: string;
  fullTitle: string;
  assetUrl: string;
};

type BaseHelpEntry = {
  id: string;
  title: string;
  subtitle?: string;
  parentId: string | null;
  order: number;
  navVisibility: 'primary' | 'secondary';
};

export type ShortcutHelpEntry = BaseHelpEntry & {
  id: 'shortcuts';
  kind: 'shortcuts';
};

export type AboutHelpEntry = BaseHelpEntry & {
  id: 'about';
  kind: 'about';
};

export type SectionHelpEntry = BaseHelpEntry & {
  kind: 'section';
};

export type MarkdownHelpEntry = BaseHelpEntry & {
  kind: 'markdown';
  path: string;
  fileName: string;
  assetUrl: string;
  aliases: readonly HelpDocAlias[];
};

export type HelpEntry = ShortcutHelpEntry | AboutHelpEntry | SectionHelpEntry | MarkdownHelpEntry;

export type HelpLinkTarget =
  | { kind: 'anchor'; anchor: string }
  | { kind: 'document'; path: string; anchor: string | null }
  | { kind: 'external'; href: string }
  | { kind: 'inert'; href: string };

export type HelpTreeRow = {
  entry: HelpEntry;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
};

export type HelpHeading = {
  depth: number;
  text: string;
  anchor: string;
};

type MaterializedHelpData = {
  entries: HelpEntry[];
  entryById: Map<string, HelpEntry>;
  entryByPath: Map<string, MarkdownHelpEntry>;
  childIdsByParent: Map<string | null, string[]>;
  rootIds: string[];
};

const DOC_FILES = helpDocsManifest as HelpDocManifestEntry[];
const FALLBACK_PLANNING_PARENT_ID = 'section:developers-planning';
const MARKDOWN_HEADING_FENCE_RE = /^\s*(`{3,}|~{3,})/;
const MARKDOWN_HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

export const HELP_BROWSER_DOC_PATH = 'docs/HELP_BROWSER.md';

export function splitHelpEntryTitle(value: string) {
  const match = value.match(/^(.*?)\s(?:-|–|—)\s(.*)$/);
  if (!match?.[1] || !match[2]) {
    return { title: value.trim(), subtitle: undefined };
  }

  return {
    title: match[1].trim(),
    subtitle: match[2].trim() || undefined,
  };
}

export function slugifyMarkdownHeading(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[`']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeHelpAnchor(value: string) {
  return slugifyMarkdownHeading(decodeURIComponent(value.replace(/^#/, '').trim()));
}

export function getHelpEntries() {
  return getMaterializedHelpData().entries;
}

export function getMarkdownHelpEntries() {
  return getHelpEntries().filter((entry): entry is MarkdownHelpEntry => entry.kind === 'markdown');
}

export function getHelpRootEntries() {
  const data = getMaterializedHelpData();
  return data.rootIds.map((id) => data.entryById.get(id)).filter((entry): entry is HelpEntry => entry != null);
}

export function getHelpChildEntries(parentId: string | null) {
  const data = getMaterializedHelpData();
  const childIds = data.childIdsByParent.get(parentId) ?? [];
  return childIds.map((id) => data.entryById.get(id)).filter((entry): entry is HelpEntry => entry != null);
}

export function getHelpEntryById(entryId: string) {
  return getMaterializedHelpData().entryById.get(entryId) ?? null;
}

export function getHelpEntryByPath(path: string) {
  return getMaterializedHelpData().entryByPath.get(path) ?? null;
}

export function getHelpBreadcrumbs(entryId: string) {
  const data = getMaterializedHelpData();
  const breadcrumbs: HelpEntry[] = [];
  let current = data.entryById.get(entryId) ?? null;

  while (current) {
    breadcrumbs.push(current);
    current = current.parentId ? (data.entryById.get(current.parentId) ?? null) : null;
  }

  return breadcrumbs.reverse();
}

export function getHelpInitialExpandedIds(activeEntryId?: string | null) {
  const expandedIds = new Set<string>();

  for (const entry of getHelpRootEntries()) {
    if (getHelpChildEntries(entry.id).length > 0) {
      expandedIds.add(entry.id);
    }
  }

  if (!activeEntryId) {
    return expandedIds;
  }

  for (const breadcrumb of getHelpBreadcrumbs(activeEntryId)) {
    if (getHelpChildEntries(breadcrumb.id).length > 0) {
      expandedIds.add(breadcrumb.id);
    }
  }

  return expandedIds;
}

export function buildHelpTreeRows(activeEntryId: string, expandedIds: Set<string>) {
  const rows: HelpTreeRow[] = [];

  function visit(parentId: string | null, depth: number) {
    for (const entry of getHelpChildEntries(parentId)) {
      const hasChildren = getHelpChildEntries(entry.id).length > 0;
      const isExpanded = expandedIds.has(entry.id);
      rows.push({
        entry,
        depth,
        hasChildren,
        isExpanded,
        isSelected: entry.id === activeEntryId,
      });

      if (hasChildren && isExpanded) {
        visit(entry.id, depth + 1);
      }
    }
  }

  visit(null, 0);
  return rows;
}

export function resolveHelpLink(currentPath: string, href: string, availableDocPaths: Iterable<string>): HelpLinkTarget {
  const trimmedHref = href.trim();
  if (!trimmedHref) {
    return { kind: 'inert', href };
  }

  if (trimmedHref.startsWith('#')) {
    return { kind: 'anchor', anchor: normalizeHelpAnchor(trimmedHref) };
  }

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmedHref)) {
    return { kind: 'external', href: trimmedHref };
  }

  if (trimmedHref.startsWith('/')) {
    return { kind: 'inert', href: trimmedHref };
  }

  const [rawPath, rawHash = ''] = trimmedHref.split('#', 2);
  if (!rawPath.toLowerCase().endsWith('.md')) {
    return { kind: 'inert', href: trimmedHref };
  }

  const resolvedPath = resolveRelativeHelpPath(currentPath, rawPath);
  const anchor = rawHash ? normalizeHelpAnchor(rawHash) : null;
  const aliasTarget = resolveHelpAlias(resolvedPath, anchor);
  if (aliasTarget) {
    return {
      kind: 'document',
      path: aliasTarget.path,
      anchor: aliasTarget.anchor,
    };
  }

  const knownPaths = new Set(availableDocPaths);
  if (!knownPaths.has(resolvedPath)) {
    return { kind: 'inert', href: trimmedHref };
  }

  return {
    kind: 'document',
    path: resolvedPath,
    anchor,
  };
}

export function resolveHelpAssetUrl(currentPath: string, src: string) {
  const trimmedSrc = src.trim();
  if (!trimmedSrc) {
    return null;
  }

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmedSrc) || trimmedSrc.startsWith('/')) {
    return trimmedSrc;
  }

  const resolvedPath = resolveRelativeHelpPath(currentPath, trimmedSrc);
  if (!resolvedPath.startsWith('docs/')) {
    return null;
  }

  return `/assets/help-docs/${resolvedPath.slice('docs/'.length)}`;
}

export function extractMarkdownHeadings(raw: string): HelpHeading[] {
  const headings: HelpHeading[] = [];
  const lines = raw.split('\n');
  let activeFenceChar: '`' | '~' | null = null;
  let activeFenceLength = 0;

  for (const line of lines) {
    const fenceMatch = line.match(MARKDOWN_HEADING_FENCE_RE);
    if (fenceMatch) {
      const nextFenceChar = fenceMatch[1][0] as '`' | '~';
      const nextFenceLength = fenceMatch[1].length;
      if (!activeFenceChar) {
        activeFenceChar = nextFenceChar;
        activeFenceLength = nextFenceLength;
      } else if (activeFenceChar === nextFenceChar && nextFenceLength >= activeFenceLength) {
        activeFenceChar = null;
        activeFenceLength = 0;
      }
      continue;
    }

    if (activeFenceChar) {
      continue;
    }

    const headingMatch = line.match(MARKDOWN_HEADING_RE);
    if (!headingMatch?.[2]) {
      continue;
    }

    const text = stripMarkdownText(headingMatch[2]);
    if (!text) {
      continue;
    }

    headings.push({
      depth: headingMatch[1].length,
      text,
      anchor: slugifyMarkdownHeading(text),
    });
  }

  return headings;
}

function getMaterializedHelpData(): MaterializedHelpData {
  const manifestByPath = new Map(DOC_FILES.map((entry) => [entry.path, entry] as const));
  const entries: HelpEntry[] = [];
  const usedPaths = new Set<string>();

  for (const registryEntry of HELP_DOC_REGISTRY) {
    const materialized = materializeRegistryEntry(registryEntry, manifestByPath);
    if (!materialized) {
      continue;
    }

    entries.push(materialized);
    if (materialized.kind === 'markdown') {
      usedPaths.add(materialized.path);
    }
  }

  let fallbackOrder = 1000;
  for (const manifestEntry of DOC_FILES) {
    if (usedPaths.has(manifestEntry.path)) {
      continue;
    }

    const { title, subtitle } = splitHelpEntryTitle(manifestEntry.fullTitle.trim());
    entries.push({
      id: `doc:${manifestEntry.path}`,
      kind: 'markdown',
      title,
      subtitle,
      parentId: FALLBACK_PLANNING_PARENT_ID,
      order: fallbackOrder++,
      navVisibility: 'secondary',
      path: manifestEntry.path,
      fileName: manifestEntry.fileName,
      assetUrl: manifestEntry.assetUrl,
      aliases: [],
    });
  }

  const entryById = new Map(entries.map((entry) => [entry.id, entry] as const));
  const entryByPath = new Map(
    entries
      .filter((entry): entry is MarkdownHelpEntry => entry.kind === 'markdown')
      .map((entry) => [entry.path, entry] as const),
  );
  const childIdsByParent = buildChildIdsByParent(entries, entryById);
  const rootIds = childIdsByParent.get(null) ?? [];

  return {
    entries,
    entryById,
    entryByPath,
    childIdsByParent,
    rootIds,
  };
}

function materializeRegistryEntry(
  entry: HelpDocRegistryEntry,
  manifestByPath: Map<string, HelpDocManifestEntry>,
): HelpEntry | null {
  if (entry.kind === 'about') {
    return {
      id: 'about',
      kind: 'about',
      title: entry.title,
      subtitle: entry.subtitle,
      order: entry.order,
      parentId: null,
      navVisibility: entry.navVisibility ?? 'primary',
    };
  }

  if (entry.kind === 'shortcuts') {
    return {
      id: 'shortcuts',
      kind: 'shortcuts',
      title: entry.title,
      subtitle: entry.subtitle,
      order: entry.order,
      parentId: null,
      navVisibility: entry.navVisibility ?? 'primary',
    };
  }

  if (entry.kind === 'section') {
    return {
      ...entry,
      parentId: entry.parentId ?? null,
      navVisibility: entry.navVisibility ?? 'primary',
    };
  }

  if (entry.kind !== 'markdown') {
    return null;
  }

  const manifestEntry = manifestByPath.get(entry.sourcePath);
  if (!manifestEntry) {
    return null;
  }

  const derived = splitHelpEntryTitle(manifestEntry.fullTitle.trim());
  return {
    id: entry.id,
    kind: 'markdown',
    title: entry.title ?? derived.title,
    subtitle: entry.subtitle ?? derived.subtitle,
    parentId: entry.parentId ?? null,
    order: entry.order,
    navVisibility: entry.navVisibility ?? 'primary',
    path: manifestEntry.path,
    fileName: manifestEntry.fileName,
    assetUrl: manifestEntry.assetUrl,
    aliases: entry.aliases ?? [],
  };
}

function buildChildIdsByParent(entries: HelpEntry[], entryById: Map<string, HelpEntry>) {
  const childIdsByParent = new Map<string | null, string[]>();

  for (const entry of entries) {
    const siblings = childIdsByParent.get(entry.parentId) ?? [];
    siblings.push(entry.id);
    childIdsByParent.set(entry.parentId, siblings);
  }

  for (const [parentId, childIds] of childIdsByParent) {
    childIds.sort((leftId, rightId) => {
      const left = entryById.get(leftId);
      const right = entryById.get(rightId);
      if (!left || !right) {
        return 0;
      }
      if (left.order !== right.order) {
        return left.order - right.order;
      }
      return left.title.localeCompare(right.title);
    });
    childIdsByParent.set(parentId, childIds);
  }

  return childIdsByParent;
}

function resolveHelpAlias(path: string, anchor: string | null) {
  for (const entry of getMarkdownHelpEntries()) {
    for (const alias of entry.aliases) {
      const aliasAnchor = alias.anchor ? normalizeHelpAnchor(alias.anchor) : null;
      if (alias.path !== path) {
        continue;
      }
      if (aliasAnchor !== anchor) {
        continue;
      }
      return {
        path: entry.path,
        anchor: alias.targetAnchor === undefined ? anchor : alias.targetAnchor,
      };
    }
  }

  if (anchor == null) {
    for (const entry of getMarkdownHelpEntries()) {
      for (const alias of entry.aliases) {
        if (alias.path === path && alias.anchor == null) {
          return {
            path: entry.path,
            anchor: alias.targetAnchor ?? null,
          };
        }
      }
    }
  }

  return null;
}

function resolveRelativeHelpPath(currentPath: string, relativePath: string) {
  const currentSegments = currentPath.split('/').slice(0, -1);
  const targetSegments = relativePath.split('/');

  for (const segment of targetSegments) {
    if (!segment || segment === '.') {
      continue;
    }
    if (segment === '..') {
      currentSegments.pop();
      continue;
    }
    currentSegments.push(segment);
  }

  return currentSegments.join('/');
}

function stripMarkdownText(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .trim();
}
