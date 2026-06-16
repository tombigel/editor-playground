export function resolvePublicAssetUrl(
  path: string,
  baseUrl = import.meta.env.BASE_URL,
) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}${normalizedPath}`;
}
