import { describe, expect, it } from 'vitest';
import { Stage } from '../editorViewApi';

describe('api/editorViewApi', () => {
  it('exposes the stage view boundary', () => {
    expect(Stage).toBeTypeOf('function');
  });
});
