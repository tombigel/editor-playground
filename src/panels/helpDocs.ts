import helpDocsManifest from './generated/helpDocsManifest.json';

export type ShortcutHelpEntry = {
  id: 'shortcuts';
  kind: 'shortcuts';
  title: string;
  subtitle?: string;
};

export type DividerHelpEntry = {
  id: string;
  kind: 'divider';
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

export type HelpEntry = ShortcutHelpEntry | MarkdownHelpEntry | DividerHelpEntry;

export type HelpLinkTarget =
  | { kind: 'anchor'; anchor: string }
  | { kind: 'document'; path: string; anchor: string | null }
  | { kind: 'external'; href: string }
  | { kind: 'inert'; href: string };

const DOC_FILES = helpDocsManifest as HelpDocManifestEntry[];

export const HELP_BROWSER_DOC_PATH = 'docs/HELP_BROWSER.md';

export const HELP_DOC_DIVIDER = '---' as const;

const HELP_DOC_ORDER: readonly (string | typeof HELP_DOC_DIVIDER)[] = [
  'docs/PLAYGROUND_SPEC.md',
  'docs/API.md',
  'docs/EDITOR_STYLE_GUIDE.md',
  HELP_DOC_DIVIDER,
  'docs/PLAYGROUND_ROADMAP.md',
  'docs/NEXT_STAGE_BRIEF.md',
  HELP_DOC_DIVIDER,
  'docs/CONSOLE_TEST_GUIDE.md',
  'docs/STICKY_RENDER_MODEL.md',
  'docs/Interact Accessibility Discussion.md',
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

export function getMarkdownHelpEntries(
  source: readonly HelpDocManifestEntry[] = DOC_FILES,
): (MarkdownHelpEntry | DividerHelpEntry)[] {
  const entryByPath = new Map(
    source.map((entry) => {
      const { title, subtitle } = splitHelpEntryTitle(entry.fullTitle.trim());
      return [
        entry.path,
        {
          id: `doc:${entry.path}`,
          kind: 'markdown' as const,
          title,
          subtitle,
          path: entry.path,
          fileName: entry.fileName,
          assetUrl: entry.assetUrl,
        } satisfies MarkdownHelpEntry,
      ];
    }),
  );

  const result: (MarkdownHelpEntry | DividerHelpEntry)[] = [];
  const used = new Set<string>();
  let dividerCount = 0;

  for (const item of HELP_DOC_ORDER) {
    if (item === HELP_DOC_DIVIDER) {
      result.push({ id: `divider-${dividerCount++}`, kind: 'divider' });
    } else {
      const entry = entryByPath.get(item);
      if (entry) {
        result.push(entry);
        used.add(item);
      }
    }
  }

  for (const [path, entry] of entryByPath) {
    if (!used.has(path)) {
      result.push(entry);
    }
  }

  return result;
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

