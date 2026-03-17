import { describe, expect, it } from 'vitest';
// @ts-expect-error test-only Node builtin import without app-level Node typings
import { readFileSync } from 'fs';

describe('stage/stage styles', () => {
  it('removes box and filter shadows from dragged stage nodes', () => {
    const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

    expect(styles).toContain('.drag-source,');
    expect(styles).toContain('.drag-source *');
    expect(styles).toContain('.drag-source::before');
    expect(styles).toContain('box-shadow: none !important;');
    expect(styles).toContain('filter: none !important;');
  });
});
