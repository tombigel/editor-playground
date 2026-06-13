export function syncPackageJsonVersion(packageJsonContent, version) {
  const packageJson = JSON.parse(packageJsonContent);
  packageJson.version = version;
  return `${JSON.stringify(packageJson, null, 2)}\n`;
}

export function getPnpmLockSyncCommand() {
  return 'corepack pnpm install --lockfile-only --ignore-scripts';
}
