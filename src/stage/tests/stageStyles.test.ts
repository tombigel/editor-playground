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

  it('derives sticky guide colors from shared editor accent tokens', () => {
    const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

    expect(styles).toContain('--editor-sticky-distance-guide-color: var(--editor-accent);');
    expect(styles).toContain('--sticky-guide-color: var(--editor-sticky-offset-guide-color);');
    expect(styles).toContain('background: var(--editor-sticky-distance-label-background);');
    expect(styles).toContain('background: var(--editor-sticky-auto-label-background);');
  });
});
