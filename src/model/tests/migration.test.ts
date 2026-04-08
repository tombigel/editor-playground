import { describe, expect, it } from 'vitest';
import { migrateDocumentModel } from '../migration';

describe('model/migration', () => {
  it('normalizes legacy flat rich content arrays into paragraph blocks', () => {
    const raw = {
      rootId: 'site-root',
      nodes: {
        'site-root': {
          id: 'site-root',
          parentId: null,
          children: ['section-1'],
          name: 'Site',
          visible: true,
          locked: false,
          contentType: 'site',
          type: 'site',
        },
        'section-1': {
          id: 'section-1',
          parentId: 'site-root',
          children: ['rich-1'],
          name: 'Section',
          visible: true,
          locked: false,
          contentType: 'container',
          subtype: 'section',
          rect: {
            x: { base: { value: 0, unit: 'px' } },
            y: { base: { value: 0, unit: 'px' } },
            width: { base: { value: 100, unit: 'vw' } },
            height: { base: { keyword: 'auto' } },
          },
          style: {},
        },
        'rich-1': {
          id: 'rich-1',
          parentId: 'section-1',
          children: [],
          name: 'Rich',
          visible: true,
          locked: false,
          contentType: 'text',
          subtype: 'rich',
          htmlTag: 'h2',
          rect: {
            x: { base: { value: 0, unit: 'px' } },
            y: { base: { value: 0, unit: 'px' } },
            width: { base: { value: 320, unit: 'px' } },
            height: { base: { keyword: 'auto' } },
          },
          content: [{ text: 'legacy rich' }],
        },
      },
      fontLibrary: {
        defaults: [],
        favorites: [],
        usedFamilies: [],
      },
    } as unknown;

    const migrated = migrateDocumentModel(raw);
    const rich = migrated.nodes['rich-1'];

    if (rich.contentType !== 'text' || rich.subtype !== 'rich') {
      throw new Error('Expected rich text node');
    }

    expect(rich.content).toEqual([
      { type: 'paragraph', children: [{ text: 'legacy rich' }] },
    ]);
    expect(rich.htmlTag).toBeUndefined();
  });
});
