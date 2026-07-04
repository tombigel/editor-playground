import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createInitialDocument } from '../../model/defaults';
import { MultiStickySection } from '../MultiStickySection';
import { StickySection } from '../inspector/StickySection';
import type { InspectorActionHandlers } from '../inspector/types';

const ACTIONS: Pick<
  InspectorActionHandlers,
  | 'onStickyEnabled'
  | 'onStickyTarget'
  | 'onStickyEdges'
  | 'onStickyOffset'
  | 'onStickyOffsetTop'
  | 'onStickyOffsetBottom'
  | 'onStickyDurationMode'
  | 'onStickyDuration'
  | 'onStickyDurationTop'
  | 'onStickyDurationBottom'
  | 'onStickyElevation'
  | 'onStickyElevated'
  | 'onEnterFocusedMode'
> = {
  onStickyEnabled: () => {},
  onStickyTarget: () => {},
  onStickyEdges: () => {},
  onStickyOffset: () => {},
  onStickyOffsetTop: () => {},
  onStickyOffsetBottom: () => {},
  onStickyDurationMode: () => {},
  onStickyDuration: () => {},
  onStickyDurationTop: () => {},
  onStickyDurationBottom: () => {},
  onStickyElevation: () => {},
  onStickyElevated: () => {},
  onEnterFocusedMode: () => {},
};

describe('panels/sticky sections', () => {
  it('uses FormField inline rows for single sticky duration mode', () => {
    const document = createInitialDocument();
    const node = Object.values(document.nodes).find((candidate) => candidate.contentType === 'text');

    if (!node || node.contentType !== 'text') {
      throw new Error('Expected text node');
    }

    node.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: false },
      durationMode: 'custom',
      duration: { raw: '100vh', parsed: { value: 100, unit: 'vh' } },
      durationTop: { raw: '100vh', parsed: { value: 100, unit: 'vh' } },
      durationBottom: { raw: '100vh', parsed: { value: 100, unit: 'vh' } },
      offsetTop: { raw: '0vh', parsed: { value: 0, unit: 'vh' } },
    };

    const markup = renderToStaticMarkup(
      <StickySection
        node={node}
        actions={ACTIONS}
        focusedMode={null}
        globalStickyElevation={false}
      />,
    );

    expect(markup).toContain('data-ui="form-field"');
    expect(markup).toContain('data-layout="inline"');
    expect(markup).toContain('>Duration<');
    expect(markup).toContain('>Auto<');
    expect(markup).toContain('>Custom<');
  });

  it('uses FormField inline rows for multi-select sticky duration mode', () => {
    const document = createInitialDocument();
    const nodes = Object.values(document.nodes).filter((candidate) => candidate.contentType === 'text').slice(0, 2);

    if (nodes.length < 2 || nodes.some((candidate) => candidate.contentType !== 'text')) {
      throw new Error('Expected two text nodes');
    }

    for (const node of nodes) {
      node.sticky = {
        enabled: true,
        target: 'self',
        edges: { top: true, bottom: false },
        durationMode: 'custom',
        duration: { raw: '100vh', parsed: { value: 100, unit: 'vh' } },
        durationTop: { raw: '100vh', parsed: { value: 100, unit: 'vh' } },
        durationBottom: { raw: '100vh', parsed: { value: 100, unit: 'vh' } },
        offsetTop: { raw: '0vh', parsed: { value: 0, unit: 'vh' } },
      };
    }

    const markup = renderToStaticMarkup(
      <MultiStickySection
        selectedNodes={nodes}
        actions={ACTIONS}
        focusedMode={null}
        globalStickyElevation={false}
      />,
    );

    expect(markup).toContain('data-ui="form-field"');
    expect(markup).toContain('data-layout="inline"');
    expect(markup).toContain('>Duration<');
    expect(markup).toContain('>Auto<');
    expect(markup).toContain('>Custom<');
  });

  it('uses editor tokens for mixed multi-select switch styling', () => {
    const document = createInitialDocument();
    const nodes = Object.values(document.nodes).filter((candidate) => candidate.contentType === 'text').slice(0, 2);

    const [firstNode, secondNode] = nodes;

    if (!firstNode || !secondNode || firstNode.contentType !== 'text' || secondNode.contentType !== 'text') {
      throw new Error('Expected two text nodes');
    }

    firstNode.sticky = {
      enabled: true,
      elevated: true,
      target: 'self',
      edges: { top: true, bottom: false },
      durationMode: 'auto',
      duration: { raw: '100vh', parsed: { value: 100, unit: 'vh' } },
      durationTop: { raw: '100vh', parsed: { value: 100, unit: 'vh' } },
      durationBottom: { raw: '100vh', parsed: { value: 100, unit: 'vh' } },
      offsetTop: { raw: '0vh', parsed: { value: 0, unit: 'vh' } },
    };
    secondNode.sticky = {
      enabled: false,
      elevated: false,
      target: 'self',
      edges: { top: true, bottom: false },
      durationMode: 'auto',
      duration: { raw: '100vh', parsed: { value: 100, unit: 'vh' } },
      durationTop: { raw: '100vh', parsed: { value: 100, unit: 'vh' } },
      durationBottom: { raw: '100vh', parsed: { value: 100, unit: 'vh' } },
      offsetTop: { raw: '0vh', parsed: { value: 0, unit: 'vh' } },
    };

    const markup = renderToStaticMarkup(
      <MultiStickySection
        selectedNodes={nodes}
        actions={ACTIONS}
        focusedMode={null}
        globalStickyElevation={false}
      />,
    );

    expect(markup).toContain('data-mixed="true"');
    expect(markup).not.toContain('--editor-switch-background-mixed');
    expect(markup).toContain('--editor-switch-mixed-indicator');
    expect(markup).not.toContain('!');
    expect(markup).not.toContain('var(--editor-accent)_50%');
    expect(markup).not.toContain('bg-slate-400');
  });
});
