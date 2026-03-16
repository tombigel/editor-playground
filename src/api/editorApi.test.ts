import { describe, expect, it } from 'vitest';
import { editorApi, getValidationErrors, parseUnitValue, SECTION_TEMPLATES } from './editorApi';

describe('api/editorApi', () => {
  it('exposes the editor boundary as explicit bindings', () => {
    const state = editorApi.createInitialState();

    expect(editorApi.parseUnitValue('24px')).toEqual(parseUnitValue('24px'));
    expect(editorApi.SECTION_TEMPLATES).toBe(SECTION_TEMPLATES);
    expect(editorApi.getValidationErrors(state)).toEqual(getValidationErrors(state));
    expect(editorApi.serializeDocumentJson(state.document)).toContain('"rootId"');
    expect(state.document.rootId).toBeDefined();
  });
});
