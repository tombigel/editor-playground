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

export function isFullyTransparentColorValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.toLowerCase() === 'transparent') {
    return true;
  }

  const hexMatch = trimmed.match(/^#([\da-f]{4}|[\da-f]{8})$/i);
  if (hexMatch) {
    const digits = hexMatch[1];
    const alpha = digits.length === 4 ? digits[3] : digits.slice(6, 8);
    return /^0+$/i.test(alpha);
  }

  const rgbCommaMatch = trimmed.match(/^rgba\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^)]+)\)$/i);
  if (rgbCommaMatch) {
    return isZeroAlpha(rgbCommaMatch[1]);
  }

  const rgbSlashMatch = trimmed.match(/^rgba?\((.+)\/(.+)\)$/i);
  if (rgbSlashMatch) {
    return isZeroAlpha(rgbSlashMatch[2]);
  }

  const genericSlashMatch = trimmed.match(/^([a-z][\w-]*\(.+)\/([^)]+)\)$/i);
  if (genericSlashMatch) {
    return isZeroAlpha(genericSlashMatch[2]);
  }

  return false;
}

function isZeroAlpha(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.endsWith('%')) {
    const percent = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(percent) && percent <= 0;
  }

  const numeric = Number.parseFloat(trimmed);
  return Number.isFinite(numeric) && numeric <= 0;
}
