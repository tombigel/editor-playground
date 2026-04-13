import { describe, expect, it } from 'vitest';

const scriptPath: string = '../../../scripts/bump-version-lib.mjs';
const { getPackageLockSyncCommand, syncPackageJsonVersion } = (await import(scriptPath)) as {
  getPackageLockSyncCommand: () => string;
  syncPackageJsonVersion: (packageJsonContent: string, version: string) => string;
};

describe('version bump helpers', () => {
  it('syncs the package manifest version', () => {
    const updated = syncPackageJsonVersion(
      JSON.stringify(
        {
          name: 'sticky-playground',
          private: true,
          version: '0.6.1',
        },
        null,
        2,
      ),
      '0.6.2',
    );

    expect(JSON.parse(updated)).toMatchObject({
      name: 'sticky-playground',
      private: true,
      version: '0.6.2',
    });
    expect(updated.endsWith('\n')).toBe(true);
  });

  it('uses npm to refresh the lockfile', () => {
    expect(getPackageLockSyncCommand()).toBe('npm install --package-lock-only --ignore-scripts');
  });
});
