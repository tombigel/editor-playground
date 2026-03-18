import { describe, expect, it } from 'vitest';
import { buildDocumentDefaultFontStack, getDocumentDefaultFontFamily } from '../defaults';

describe('fonts/defaults', () => {
  it('falls back to the built-in default family when a legacy document has no font library', () => {
    expect(getDocumentDefaultFontFamily({})).toMatchObject({ family: 'Inter' });
    expect(buildDocumentDefaultFontStack({})).toContain('Inter');
  });
});
