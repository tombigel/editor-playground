import { describe, expect, it } from 'vitest';
import {
  createBlankInitialDocument,
  createInitialState,
  getValidationErrors,
  parseUnitValue,
  SECTION_TEMPLATES,
  serializeDocumentJson,
} from '../editorApi';

describe('api/editorApi', () => {
  it('exposes the editor boundary as named bindings', () => {
    const state = createInitialState();
    const serialized = JSON.parse(serializeDocumentJson(state.document)) as {
      rootId: string;
      nodes: Record<string, unknown>;
    };

    expect(parseUnitValue('24px')).toMatchObject({
      raw: '24px',
      parsed: { value: 24, unit: 'px' },
    });
    expect(SECTION_TEMPLATES.length).toBeGreaterThan(0);
    expect(getValidationErrors(state)).toEqual([]);
    expect(createBlankInitialDocument().rootId).toBeDefined();
    expect(serialized.rootId).toBe(state.document.rootId);
    expect(serialized.nodes).toHaveProperty(state.document.rootId);
    expect(state.document.rootId).toBeDefined();
  });
});
