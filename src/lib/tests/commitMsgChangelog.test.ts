import { describe, expect, it } from 'vitest';

// @ts-expect-error Script helper is exercised directly from the test.
const { updateUnreleasedChangelog } = await import('../../../scripts/commit-msg-changelog-lib.mjs');

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
});
