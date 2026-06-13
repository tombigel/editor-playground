import { describe, expect, it } from 'vitest';

// @ts-expect-error Script helper is exercised directly from the test.
const changelogLib = await import('../../../scripts/commit-msg-changelog-lib.mjs');
const { isChangelogOnly, isReleaseBookkeepingOnly, updateUnreleasedChangelog } = changelogLib;

describe('updateUnreleasedChangelog', () => {
  it('formats unreleased categories with markdownlint-safe spacing', () => {
    const changelog = `# Changelog

---

## [Unreleased]

### Fixed

- existing fix

---
`;

    const result = updateUnreleasedChangelog(changelog, 'feat: add spacing-safe changelog output');

    expect(result.updatedChangelog).toContain(`## [Unreleased]

### Added

- add spacing-safe changelog output

### Fixed

- existing fix

---`);
    expect(result.updatedChangelog).not.toMatch(/^### .*\n- /m);
  });

  it('defaults non-conventional commits into the changed section', () => {
    const changelog = `# Changelog

---

## [Unreleased]

---
`;

    const result = updateUnreleasedChangelog(changelog, 'tighten changelog formatting');

    expect(result.updatedChangelog).toContain(`## [Unreleased]

### Changed

- tighten changelog formatting

---`);
  });

  it('identifies changelog-only commits for patch-bump skips', () => {
    expect(isChangelogOnly(['CHANGELOG.md'])).toBe(true);
    expect(isChangelogOnly(['CHANGELOG.md', 'src/lib/version.ts'])).toBe(false);
    expect(isChangelogOnly([])).toBe(false);
  });

  it('identifies release bookkeeping commits for changelog skips', () => {
    expect(isReleaseBookkeepingOnly([
      'CHANGELOG.md',
      'pnpm-lock.yaml',
      'package.json',
      'src/lib/version.ts',
    ])).toBe(true);
    expect(isReleaseBookkeepingOnly(['CHANGELOG.md'])).toBe(true);
    expect(isReleaseBookkeepingOnly(['CHANGELOG.md', 'src/api/documentApi.ts'])).toBe(false);
    expect(isReleaseBookkeepingOnly([])).toBe(false);
  });
});
