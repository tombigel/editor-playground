// Prefix -> changelog heading mapping
export const CATEGORY_MAP = {
  feat: '### Added',
  fix: '### Fixed',
  refactor: '### Changed',
  style: '### Changed',
  perf: '### Changed',
  docs: '### Changed',
  test: '### Changed',
  build: '### Changed',
  ci: '### Changed',
  chore: '### Changed',
};

export const DEFAULT_CATEGORY = '### Changed';
export const UNRELEASED_HEADING = '## [Unreleased]';
export const SECTION_SEPARATOR = '\n---\n';
export const HEADING_ORDER = ['### Added', '### Changed', '### Fixed'];

export function parseCommitMessage(rawMsg) {
  const firstLine = rawMsg.split('\n')[0]?.trim() ?? '';
  if (!firstLine) {
    return null;
  }

  // Conventional commit: type(scope)!: description
  const conventionalMatch = firstLine.match(/^(\w+)(?:\([^)]*\))?!?:\s*(.+)$/);
  const category = conventionalMatch
    ? (CATEGORY_MAP[conventionalMatch[1]] ?? DEFAULT_CATEGORY)
    : DEFAULT_CATEGORY;
  const description = conventionalMatch ? conventionalMatch[2] : firstLine;

  return { category, description };
}

function sortHeadings(a, b) {
  const leftIndex = HEADING_ORDER.indexOf(a);
  const rightIndex = HEADING_ORDER.indexOf(b);
  const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
  const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

  return normalizedLeft - normalizedRight;
}

function serializeBuckets(buckets) {
  return [...buckets.entries()]
    .filter(([, bullets]) => bullets && bullets.length > 0)
    .sort(([left], [right]) => sortHeadings(left, right))
    .flatMap(([heading, bullets], index) => {
      const block = [heading, '', ...bullets];
      if (index > 0) {
        block.unshift('');
      }
      return block;
    })
    .join('\n');
}

export function updateUnreleasedChangelog(changelog, rawMsg) {
  const parsed = parseCommitMessage(rawMsg);
  if (!parsed) {
    return { updatedChangelog: changelog, changed: false, missingUnreleasedHeading: false };
  }

  const headingIndex = changelog.indexOf(UNRELEASED_HEADING);
  if (headingIndex === -1) {
    return { updatedChangelog: changelog, changed: false, missingUnreleasedHeading: true };
  }

  const afterHeading = headingIndex + UNRELEASED_HEADING.length;
  const nextSeparator = changelog.indexOf(SECTION_SEPARATOR, afterHeading);
  const sectionEnd = nextSeparator !== -1 ? nextSeparator : changelog.length;

  const sectionContent = changelog.slice(afterHeading, sectionEnd);
  const buckets = new Map();
  let currentBucket = null;

  for (const line of sectionContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) {
      currentBucket = trimmed;
      if (!buckets.has(currentBucket)) {
        buckets.set(currentBucket, []);
      }
      continue;
    }

    if (trimmed.startsWith('- ') && currentBucket) {
      buckets.get(currentBucket).push(trimmed);
    }
  }

  if (!buckets.has(parsed.category)) {
    buckets.set(parsed.category, []);
  }
  buckets.get(parsed.category).push(`- ${parsed.description}`);

  const sectionBody = serializeBuckets(buckets);
  const updatedChangelog =
    changelog.slice(0, afterHeading) +
    (sectionBody ? `\n\n${sectionBody}\n` : '\n') +
    changelog.slice(sectionEnd);

  return {
    updatedChangelog,
    changed: updatedChangelog !== changelog,
    missingUnreleasedHeading: false,
  };
}
