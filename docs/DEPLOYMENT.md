# Deployment

This project includes a manual deploy command that incrementally syncs the build output to a WebDAV-backed static hosting folder.

## Manual WebDAV Deploy

Required environment variables:

- `WEBDAV_URL`: the full WebDAV URL of the deployed site directory. For the Fastmail editor endpoint this may end in `/editor/`, but that is the backing WebDAV folder, not the public asset path.
- `WEBDAV_USER`: the WebDAV username
- `WEBDAV_PASS`: the WebDAV password
- `WEBDAV_BUILD_DIR`: optional, defaults to `dist`
- `BASE_PATH`: optional. When set, it is resolved against `WEBDAV_URL` to form the target directory. When unset, `WEBDAV_URL` is used as the full target directory.
- `WEBDAV_FORCE`: optional. Set to `1` to re-upload every file, ignoring the remote manifest.

You can export them in your shell or add them to `.env.local`.

Deploy with:

- `pnpm run deploy`

The deploy flow:

1. runs the normal production build
2. builds a local manifest of `path -> content hash` for the build output
3. compares against a `.deploy-manifest.json` stored at the remote root and a `PROPFIND` listing of remote files
4. uploads only new or changed files, deletes only files that were removed locally, and skips unchanged files
5. writes the updated `.deploy-manifest.json` so the next deploy can diff against it

Point `WEBDAV_URL` at the exact directory you want to sync. The root directory itself is preserved; only its contents are reconciled with the build. The first deploy (or one with no/corrupt remote manifest) uploads everything; subsequent deploys upload only what changed.
