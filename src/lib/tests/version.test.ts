import { describe, expect, it } from 'vitest';
import { PROJECT_VERSION, DOCUMENT_MODEL_VERSION, API_VERSION, EDITOR_VERSION } from '../version';

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

describe('version constants', () => {
  it.each([
    ['PROJECT_VERSION', PROJECT_VERSION],
    ['DOCUMENT_MODEL_VERSION', DOCUMENT_MODEL_VERSION],
    ['API_VERSION', API_VERSION],
    ['EDITOR_VERSION', EDITOR_VERSION],
  ])('%s is a valid semver string', (_name, value) => {
    expect(value).toMatch(SEMVER_RE);
  });
});
