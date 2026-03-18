export function forceOpaqueColorValue(value: string | undefined) {
  if (!value) {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  const hexMatch = trimmed.match(/^#([\da-f]{4}|[\da-f]{8})$/i);
  if (hexMatch) {
    const digits = hexMatch[1];
    return `#${digits.length === 4 ? digits.slice(0, 3) : digits.slice(0, 6)}`;
  }

  const rgbCommaMatch = trimmed.match(/^rgba\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)$/i);
  if (rgbCommaMatch) {
    return `rgb(${rgbCommaMatch[1]}, ${rgbCommaMatch[2]}, ${rgbCommaMatch[3]})`;
  }

  const rgbSlashMatch = trimmed.match(/^rgba?\((.+)\/(.+)\)$/i);
  if (rgbSlashMatch) {
    return `rgb(${rgbSlashMatch[1].trim()})`;
  }

  const genericSlashMatch = trimmed.match(/^([a-z][\w-]*\(.+)\/([^)]+)\)$/i);
  if (genericSlashMatch) {
    return `${genericSlashMatch[1].trim()})`;
  }

  return trimmed;
}
