# Deployment

This project includes a manual deploy command for replacing the contents of a WebDAV-backed static hosting folder.

## Manual WebDAV Deploy

Required environment variables:

- `WEBDAV_URL`: the full WebDAV URL of the deployed site directory. For the Fastmail editor endpoint this may end in `/editor/`, but that is the backing WebDAV folder, not the public asset path.
- `WEBDAV_USER`: the WebDAV username
- `WEBDAV_PASS`: the WebDAV password
- `WEBDAV_BUILD_DIR`: optional, defaults to `dist`

You can export them in your shell or add them to `.env.local`.

Deploy with:

- `pnpm run deploy`

The deploy flow:

1. runs the normal production build
2. deletes existing files and folders under `WEBDAV_URL`
3. uploads the fresh build output

Point `WEBDAV_URL` at the exact directory you want to replace. The root directory itself is preserved; its contents are replaced.
