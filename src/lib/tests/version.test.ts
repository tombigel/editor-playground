import { describe, expect, it } from 'vitest';
import { PROJECT_VERSION, DOCUMENT_MODEL_VERSION, API_VERSION, EDITOR_VERSION } from '../version';

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

describe('version constants', () => {
  it('PROJECT_VERSION is a valid semver string', () => {
    expect(PROJECT_VERSION).toMatch(SEMVER_RE);
  });

  it('DOCUMENT_MODEL_VERSION is a valid semver string', () => {
    expect(DOCUMENT_MODEL_VERSION).toMatch(SEMVER_RE);
  });

  it('API_VERSION is a valid semver string', () => {
    expect(API_VERSION).toMatch(SEMVER_RE);
  });

  it('EDITOR_VERSION is a valid semver string', () => {
    expect(EDITOR_VERSION).toMatch(SEMVER_RE);
  });
});
