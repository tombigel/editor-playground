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

  it('uses editor tokens for stage snap and grid overlays', () => {
    expect(styles).toContain('--editor-grid-lane-background: color-mix(in srgb, var(--editor-accent) 14%, transparent);');
    expect(styles).toContain('--editor-snap-guide-default: color-mix(in srgb, var(--editor-accent) 70%, transparent);');
    expect(styles).toContain('background: var(--editor-grid-lane-background);');
    expect(styles).toContain('var(--editor-snap-guide-default) 20%');
    expect(styles).toContain('--editor-hidden-ghost-stripe');
    expect(styles).toContain('--editor-hidden-ghost-border');
    expect(styles).not.toContain('rgba(55, 114, 255, 0.14)');
    expect(styles).not.toContain('rgba(22, 104, 255, 0.7)');
    expect(styles).not.toContain('rgba(128, 128, 128, 0.22)');
  });

  it('scopes inspector control tokens to the floating focused panel', () => {
    expect(styles).toContain('.editor-focused-panel');
    expect(styles).toContain("[data-ui='button'][data-variant='default']");
    expect(styles).toContain(".editor-font-picker-trigger:is(:focus-visible, [aria-expanded='true'])");
    expect(styles).toContain("[data-ui='button'][data-variant='ghost']");
    expect(styles).toContain("[data-ui='switch']");
    expect(styles).toContain("[data-ui='switch'][data-state='checked']");
    expect(styles).toContain("[data-ui='slider-track']");
    expect(styles).toContain("[data-ui='slider-range']");
    expect(styles).toContain("[data-ui='slider-thumb']");
  });

  it('owns mixed switch chrome in shared CSS without important utility overrides', () => {
    expect(styles).toContain("--editor-switch-mixed-indicator: #334155;");
    expect(styles).toContain("--editor-switch-mixed-indicator: #e2e8f0;");
    expect(styles).toContain("[data-ui='switch'][data-mixed='true']");
    expect(styles).toContain("border-color: var(--editor-surface-border);");
    expect(styles).toContain("background: color-mix(in srgb, var(--editor-surface-background) 72%, transparent);");
    expect(styles).toContain("[data-ui='switch'][data-mixed='true'] [data-ui='switch-thumb']");
    expect(styles).toContain("border: 1px dashed var(--editor-switch-mixed-indicator);");
  });

  it('uses simpler high-contrast chrome for clarity and ink', () => {
    expect(styles).toContain("body[data-editor-theme='light'][data-editor-light-theme='clarity']");
    expect(styles).toContain("body[data-editor-theme='dark'][data-editor-dark-theme='ink']");
    expect(styles).toContain('--editor-surface-shadow: none;');
    expect(styles).toContain('--editor-topbar-button-shadow: none;');
    expect(styles).toContain("[data-ui='input']");
    expect(styles).toContain("[data-ui='select-trigger']");
    expect(styles).toContain("[data-ui='switch']");
    expect(styles).toContain("border-width: 2px;");
    expect(styles).toContain("font-size: 12px;");
    expect(styles).toContain("font-size: 11px;");
  });

  it('keeps composite numeric fields on a single shell border with accent-colored inner segment focus', () => {
    expect(styles).toContain('.value-with-unit {');
    expect(styles).toContain('.value-with-unit-segment {');
    expect(styles).toContain('.value-with-unit-mixed {');
    expect(styles).toContain('.value-with-unit-suggestions {');
    expect(styles).toContain('box-shadow: inset 1px 0 0 var(--editor-input-border);');
    expect(styles).toContain('.value-with-unit:focus-within');
    expect(styles).toContain('outline: 2px solid var(--editor-focus-ring-strong);');
    expect(styles).not.toContain(".value-with-unit :is([data-ui='input'], [data-ui='select-trigger']):focus-visible");
    expect(styles).not.toContain(".value-with-unit [data-ui='select-trigger'][data-state='open']");
  });
});
