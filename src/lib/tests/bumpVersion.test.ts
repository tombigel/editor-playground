import { describe, expect, it } from 'vitest';

const scriptPath: string = '../../../scripts/bump-version-lib.mjs';
const { getPnpmLockSyncCommand, syncPackageJsonVersion } = (await import(scriptPath)) as {
  getPnpmLockSyncCommand: () => string;
  syncPackageJsonVersion: (packageJsonContent: string, version: string) => string;
};

describe('version bump helpers', () => {
  it('syncs the package manifest version', () => {
    const updated = syncPackageJsonVersion(
      JSON.stringify(
        {
          name: 'editor-playground',
          private: true,
          version: '0.6.1',
        },
        null,
        2,
      ),
      '0.6.2',
    );

    expect(JSON.parse(updated)).toMatchObject({
      name: 'editor-playground',
      private: true,
      version: '0.6.2',
    });
    expect(updated.endsWith('\n')).toBe(true);
  });

  it('uses pnpm to refresh the lockfile', () => {
    expect(getPnpmLockSyncCommand()).toBe('corepack pnpm install --lockfile-only --ignore-scripts');
  });
});
