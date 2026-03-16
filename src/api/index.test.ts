import { describe, expect, it } from 'vitest';
import { api, renderSiteCss, Stage } from './index';

describe('api/index', () => {
  it('aggregates the public API surface', () => {
    expect(api.renderSiteCss).toBe(renderSiteCss);
    expect(api.Stage).toBe(Stage);
    expect(api.parseUnitValue('12px')).toMatchObject({ parsed: { value: 12, unit: 'px' } });
  });
});
