import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument } from '../model/defaults';
import {
  buildSizeFieldValue,
  convertRenderedPxToFontSizeValue,
  convertStageFontSizeToInput,
  convertStageMeasurementToInput,
  convertRenderedPxToUnitValue,
  describeSizeFieldValue,
  InspectorPanel,
  normalizeAspectRatioExpression,
} from './InspectorPanel';

describe('panels/InspectorPanel', () => {
  it('renders the shared 3-button section type selector with the current type selected', () => {
    const document = createInitialDocument();
    const headerNode = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'header',
    );

    if (!headerNode || headerNode.type !== 'wrapper') {
      throw new Error('Expected header wrapper');
    }

    const markup = renderToStaticMarkup(
      <InspectorPanel
        node={headerNode}
        showOrderControls={false}
        canOrderBack={false}
        canOrderForward={false}
        canSendToBack={false}
        canBringToFront={false}
        orderBackShortcut=""
        orderForwardShortcut=""
        sendToBackShortcut=""
        bringToFrontShortcut=""
        canSectionBack={false}
        canSectionForward={false}
        onOrderBack={() => {}}
        onOrderForward={() => {}}
        onSendToBack={() => {}}
        onBringToFront={() => {}}
        onSectionBack={() => {}}
        onSectionForward={() => {}}
        onTextChange={() => {}}
        onWrapperStyleChange={() => {}}
        onRectChange={() => {}}
        onPromote={() => {}}
        onDemote={() => {}}
        onStickyEnabled={() => {}}
        onStickyTarget={() => {}}
        onStickyEdges={() => {}}
        onStickyOffset={() => {}}
        onStickyOffsetTop={() => {}}
        onStickyOffsetBottom={() => {}}
        onStickyDurationMode={() => {}}
        onStickyDuration={() => {}}
        onStickyDurationTop={() => {}}
        onStickyDurationBottom={() => {}}
      />,
    );

    expect(markup).toContain('Section type');
    expect(markup).toContain('Set type to Section');
    expect(markup).toContain('Set type to Header');
    expect(markup).toContain('Set type to Footer');
    expect(markup.match(/aria-pressed="true"/g)?.length).toBe(1);
  });

  it('describes numeric, keyword, and aspect-ratio size values for the composite field', () => {
    expect(describeSizeFieldValue('50%', 'width')).toEqual({
      kind: 'numeric',
      mode: '%',
      input: '50',
    });

    expect(describeSizeFieldValue('475.547px', 'width')).toEqual({
      kind: 'numeric',
      mode: 'px',
      input: '475.55',
    });

    expect(describeSizeFieldValue('fit-content', 'width')).toEqual({
      kind: 'keyword',
      mode: 'fit-content',
      input: '',
    });

    expect(describeSizeFieldValue('aspect-ratio(16/9)', 'height')).toEqual({
      kind: 'aspect-ratio',
      mode: 'aspect-ratio',
      input: '16/9',
    });
  });

  it('normalizes composite field output back to stored rect values', () => {
    expect(buildSizeFieldValue('width', 'vw', '33.5')).toBe('33.5vw');
    expect(buildSizeFieldValue('width', 'vmin', '12')).toBe('12vmin');
    expect(buildSizeFieldValue('x', 'vmax', '48')).toBe('48vmax');
    expect(buildSizeFieldValue('width', 'fit-content', '')).toBe('fit-content');
    expect(buildSizeFieldValue('height', 'auto', '')).toBe('auto');
    expect(buildSizeFieldValue('height', 'aspect-ratio', '16 / 9')).toBe('aspect-ratio(16/9)');
    expect(buildSizeFieldValue('height', 'aspect-ratio', '1.7778')).toBe('aspect-ratio(1.7778)');
    expect(buildSizeFieldValue('height', 'aspect-ratio', '16/9/2')).toBeNull();
    expect(buildSizeFieldValue('x', 'px', '48')).toBe('48px');
    expect(buildSizeFieldValue('x', '%', '48')).toBeNull();
  });

  it('normalizes aspect-ratio expressions from a single inline text field', () => {
    expect(normalizeAspectRatioExpression('16 / 9')).toBe('16/9');
    expect(normalizeAspectRatioExpression('1.5')).toBe('1.5');
    expect(normalizeAspectRatioExpression('0')).toBeNull();
  });

  it('converts live rendered pixels into target units when switching numeric modes', () => {
    expect(convertRenderedPxToUnitValue(144, 'width', 'vw', undefined, 1440)).toBe(10);
    expect(convertRenderedPxToUnitValue(180, 'height', 'vh', undefined, 900)).toBe(20);
    expect(convertRenderedPxToUnitValue(90, 'width', 'vmin', undefined, 900)).toBe(10);
    expect(convertRenderedPxToUnitValue(120, 'width', 'vmax', undefined, 1200)).toBe(10);
    expect(convertRenderedPxToUnitValue(250, 'width', '%', 1000)).toBe(25);
    expect(convertRenderedPxToUnitValue(48, 'x', '%', 1000)).toBeNull();
    expect(convertRenderedPxToUnitValue(428, 'width', 'vw', undefined, 1600)).toBe(26.75);
  });

  it('converts live rendered font size into target font size units', () => {
    expect(convertRenderedPxToFontSizeValue(32, 'px', { rootFontSizePx: 16, inheritedFontSizePx: 20 })).toBe(32);
    expect(convertRenderedPxToFontSizeValue(32, 'em', { rootFontSizePx: 16, inheritedFontSizePx: 20 })).toBe(1.6);
    expect(convertRenderedPxToFontSizeValue(32, 'rem', { rootFontSizePx: 16, inheritedFontSizePx: 20 })).toBe(2);
  });

  it('uses live rendered geometry when switching from keyword sizing into numeric units', () => {
    const parentRect = {
      width: 900,
      height: 600,
      left: 100,
      top: 50,
      right: 1000,
      bottom: 650,
      x: 100,
      y: 50,
      toJSON() {
        return this;
      },
    } as DOMRect;
    const childRect = {
      width: 475.546875,
      height: 208,
      left: 658,
      top: 320,
      right: 1133.546875,
      bottom: 528,
      x: 658,
      y: 320,
      toJSON() {
        return this;
      },
    } as DOMRect;
    const parent = {
      getBoundingClientRect: () => parentRect,
      closest: () => null,
    };
    const child = {
      getBoundingClientRect: () => childRect,
      parentElement: parent,
    };
    const ownerDocument = {
      getElementById: (id: string) => (id === 'stage-node-text_10' ? child : null),
      defaultView: {
        innerWidth: 1600,
        innerHeight: 1200,
      },
    } as unknown as Document;

    expect(convertStageMeasurementToInput('text_10', 'width', 'px', ownerDocument)).toBe('475.55');
    expect(convertStageMeasurementToInput('text_10', 'width', 'vw', ownerDocument)).toBe('29.72');
    expect(convertStageMeasurementToInput('text_10', 'width', 'vmin', ownerDocument)).toBe('39.63');
    expect(convertStageMeasurementToInput('text_10', 'width', 'vmax', ownerDocument)).toBe('29.72');
    expect(convertStageMeasurementToInput('text_10', 'height', '%', ownerDocument)).toBe('34.67');
  });

  it('uses live rendered font size when switching font size units', () => {
    const element = {
      parentElement: {},
    };
    const ownerDocument = {
      getElementById: (id: string) => (id === 'stage-node-text_10' ? element : null),
      documentElement: {},
      defaultView: {
        getComputedStyle: (target: unknown) => {
          if (target === element) {
            return { fontSize: '32px' };
          }
          if (target === element.parentElement) {
            return { fontSize: '20px' };
          }
          return { fontSize: '16px' };
        },
      },
    } as unknown as Document;

    expect(convertStageFontSizeToInput('text_10', 'px', ownerDocument)).toBe('32');
    expect(convertStageFontSizeToInput('text_10', 'em', ownerDocument)).toBe('1.6');
    expect(convertStageFontSizeToInput('text_10', 'rem', ownerDocument)).toBe('2');
  });

});
