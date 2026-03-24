import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const CSS_FILES = ['variables.css', 'editor-chrome.css', 'layers-panel.css', 'inspector.css', 'stage.css'];

const styles = CSS_FILES
  .map((file) => readFileSync(new URL(`../../styles/${file}`, import.meta.url), 'utf8'))
  .join('\n');

describe('stage/stage styles', () => {
  it('removes box and filter shadows from dragged stage nodes', () => {
    expect(styles).toContain('.drag-source,');
    expect(styles).toContain('.drag-source *');
    expect(styles).toContain('.drag-source::before');
    expect(styles).toContain('box-shadow: none !important;');
    expect(styles).toContain('filter: none !important;');
  });

  it('derives sticky guide colors from shared editor accent tokens', () => {
    expect(styles).toContain('--editor-sticky-distance-guide-color: var(--editor-accent);');
    expect(styles).toContain('--sticky-guide-color: var(--editor-sticky-offset-guide-color);');
    expect(styles).toContain('background: var(--editor-sticky-distance-label-background);');
    expect(styles).toContain('background: var(--editor-sticky-auto-label-background);');
  });

  it('scopes inspector control tokens to the floating focused panel', () => {
    expect(styles).toContain('.editor-focused-panel');
    expect(styles).toContain("[data-ui='button'][data-variant='default']");
    expect(styles).toContain("[data-ui='button'][data-variant='ghost']");
    expect(styles).toContain("[data-ui='switch']");
    expect(styles).toContain("[data-ui='switch'][data-state='checked']");
    expect(styles).toContain("[data-ui='slider-track']");
    expect(styles).toContain("[data-ui='slider-range']");
    expect(styles).toContain("[data-ui='slider-thumb']");
  });
});
