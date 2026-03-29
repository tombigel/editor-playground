import helpDocsManifest from './generated/helpDocsManifest.json';

export type ShortcutHelpEntry = {
  id: 'shortcuts';
  kind: 'shortcuts';
  title: string;
  subtitle?: string;
};

type HelpDocManifestEntry = {
  path: string;
  fileName: string;
  fullTitle: string;
  assetUrl: string;
};

export type MarkdownHelpEntry = {
  id: string;
  kind: 'markdown';
  title: string;
  subtitle?: string;
  path: string;
  fileName: string;
  assetUrl: string;
};

export type HelpEntry = ShortcutHelpEntry | MarkdownHelpEntry;

export type HelpLinkTarget =
  | { kind: 'anchor'; anchor: string }
  | { kind: 'document'; path: string; anchor: string | null }
  | { kind: 'external'; href: string }
  | { kind: 'inert'; href: string };

const DOC_FILES = helpDocsManifest as HelpDocManifestEntry[];

export const HELP_BROWSER_DOC_PATH = 'docs/HELP_BROWSER.md';

const HELP_DOC_ORDER: readonly string[] = [
  'docs/PLAYGROUND_SPEC.md',
  'docs/API.md',
  'docs/STICKY_RENDER_MODEL.md',
  'docs/EDITOR_STYLE_GUIDE.md',
  'docs/CONSOLE_TEST_GUIDE.md',
  'docs/PLAYGROUND_ROADMAP.md',
  HELP_BROWSER_DOC_PATH,
];

export const SHORTCUTS_HELP_ENTRY: ShortcutHelpEntry = {
  id: 'shortcuts',
  kind: 'shortcuts',
  title: 'Keyboard shortcuts',
};

export function getHelpEntries() {
  return [SHORTCUTS_HELP_ENTRY, ...getMarkdownHelpEntries()];
}

export function getMarkdownHelpEntries(source: readonly HelpDocManifestEntry[] = DOC_FILES): MarkdownHelpEntry[] {
  return source
    .map((entry) => {
      const { title, subtitle } = splitHelpEntryTitle(entry.fullTitle.trim());

      return {
        id: `doc:${entry.path}`,
        kind: 'markdown' as const,
        title,
        subtitle,
        path: entry.path,
        fileName: entry.fileName,
        assetUrl: entry.assetUrl,
      };
    })
    .sort(compareHelpEntriesByConfiguredOrder);
}

export function getConfiguredHelpDocOrder() {
  return [...HELP_DOC_ORDER];
}

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

  const resolvedPath = resolveRelativeHelpDocPath(currentPath, rawPath);
  const knownPaths = new Set(availableDocPaths);
  if (!knownPaths.has(resolvedPath)) {
    return { kind: 'inert', href: trimmedHref };
  }

  return {
    kind: 'document',
    path: resolvedPath,
    anchor: rawHash ? normalizeHelpAnchor(rawHash) : null,
  };
}

function resolveRelativeHelpDocPath(currentPath: string, relativePath: string) {
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

function compareHelpEntriesByConfiguredOrder(left: MarkdownHelpEntry, right: MarkdownHelpEntry) {
  const leftIndex = HELP_DOC_ORDER.indexOf(left.path);
  const rightIndex = HELP_DOC_ORDER.indexOf(right.path);
  const leftConfigured = leftIndex !== -1;
  const rightConfigured = rightIndex !== -1;

  if (leftConfigured && rightConfigured) {
    return leftIndex - rightIndex;
  }

  if (leftConfigured) {
    return -1;
  }

  if (rightConfigured) {
    return 1;
  }

  return left.path.localeCompare(right.path);
}
