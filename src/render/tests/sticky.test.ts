import { describe, expect, it } from 'vitest';
import { parseUnitValue } from '../../model/units';
import { getStickyCssProperties, getStickyEdgeMode } from '../sticky';

const bothSticky = {
  enabled: true,
  target: 'self' as const,
  edges: { top: true, bottom: true },
  durationMode: 'custom' as const,
  duration: parseUnitValue('20vh'),
  durationTop: parseUnitValue('20vh'),
  durationBottom: parseUnitValue('30vh'),
  offsetTop: parseUnitValue('8px'),
  offsetBottom: parseUnitValue('12px'),
};

describe('render/sticky', () => {
  it('resolves shared sticky edge mode', () => {
    expect(getStickyEdgeMode(undefined)).toBe('top');
    expect(getStickyEdgeMode({ ...bothSticky, edges: { bottom: true } })).toBe('bottom');
    expect(getStickyEdgeMode(bothSticky)).toBe('both');
  });

  it('builds shared sticky react styles', () => {
    expect(getStickyCssProperties(undefined)).toEqual({});
    expect(getStickyCssProperties(bothSticky, { includePosition: true, includeZIndex: true })).toEqual({
      position: 'sticky',
      zIndex: 1,
      top: '8px',
      bottom: '12px',
    });
  });
});
