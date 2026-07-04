import { describe, expect, it } from 'vitest';
import { migrateDocumentModel } from '../migration';
import { validateDocument } from '../validation';

const RECT = {
  x: { base: { value: 0, unit: 'px' } },
  y: { base: { value: 0, unit: 'px' } },
  width: { base: { value: 100, unit: 'px' } },
  height: { base: { keyword: 'auto' } },
};

function baseRaw(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'node-1',
    parentId: 'site-root',
    children: [],
    name: 'Node',
    visible: true,
    locked: false,
    ...overrides,
  };
}

function docWith(nodes: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    rootId: 'site-root',
    nodes,
    fontLibrary: { defaults: [], favorites: [], usedFamilies: [] },
    ...extra,
  } as unknown;
}

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

    expect(rich.content).toEqual({
      blocks: [
        { type: 'paragraph', children: [{ text: 'legacy rich' }] },
      ],
    });
    expect(rich.htmlTag).toBeUndefined();
  });

  describe('legacy site nodes', () => {
    it('migrates a bare site node without stickyElevation', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
      });
      const result = migrateDocumentModel(raw);
      const site = result.nodes['site-root'];
      expect(site.contentType).toBe('site');
      expect((site as Record<string, unknown>).stickyElevation).toBeUndefined();
    });

    it('carries stickyElevation only when it is a boolean', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site', stickyElevation: true }),
      });
      const result = migrateDocumentModel(raw);
      expect((result.nodes['site-root'] as Record<string, unknown>).stickyElevation).toBe(true);
    });

    it('drops a non-boolean stickyElevation', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site', stickyElevation: 'yes' }),
      });
      const result = migrateDocumentModel(raw);
      expect((result.nodes['site-root'] as Record<string, unknown>).stickyElevation).toBeUndefined();
    });
  });

  describe('legacy wrapper nodes', () => {
    it.each([
      ['section', 'section'],
      ['header', 'header'],
      ['footer', 'footer'],
      ['container', 'container'],
      ['group', 'group'],
      ['bogus-role', 'section'],
      [undefined, 'section'],
    ])('maps role %s to subtype %s', (role, expectedSubtype) => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        wrap: baseRaw({ id: 'wrap', type: 'wrapper', role, rect: RECT, style: {} }),
      });
      const result = migrateDocumentModel(raw);
      const wrapper = result.nodes.wrap;
      expect(wrapper.contentType).toBe('container');
      expect((wrapper as Record<string, unknown>).subtype).toBe(expectedSubtype);
    });

    it('drops a wrapper missing rect', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        wrap: baseRaw({ id: 'wrap', type: 'wrapper', role: 'section', style: {} }),
      });
      const result = migrateDocumentModel(raw);
      expect(result.nodes.wrap).toBeUndefined();
    });

    it('defaults style to {} when missing', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        wrap: baseRaw({ id: 'wrap', type: 'wrapper', role: 'section', rect: RECT }),
      });
      const result = migrateDocumentModel(raw);
      const wrapper = result.nodes.wrap as Record<string, unknown>;
      expect(wrapper.style).toEqual({});
    });

    it('carries sticky, animation, and pageTargetIds when present', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        wrap: baseRaw({
          id: 'wrap',
          type: 'wrapper',
          role: 'section',
          rect: RECT,
          style: { background: 'red' },
          sticky: { enabled: true },
          animation: { kind: 'fade' },
          pageTargetIds: ['page-1', 42, 'page-2'],
        }),
      });
      const result = migrateDocumentModel(raw);
      const wrapper = result.nodes.wrap as Record<string, unknown>;
      expect(wrapper.sticky).toEqual({ enabled: true });
      expect(wrapper.animation).toEqual({ kind: 'fade' });
      expect(wrapper.pageTargetIds).toEqual(['page-1', 'page-2']);
      expect(wrapper.style).toEqual({ background: 'red' });
    });
  });

  describe('legacy text leaves', () => {
    it.each([
      ['h1', 'h1'],
      ['h2', 'h2'],
      ['h3', 'h3'],
      ['h4', 'h4'],
      ['h5', 'h5'],
      ['h6', 'h6'],
      ['blockquote', 'blockquote'],
      ['unknown-tag', 'p'],
      [undefined, 'p'],
    ])('maps htmlTag %s to %s', (htmlTag, expectedTag) => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({
          id: 'leaf',
          type: 'leaf',
          role: 'text',
          htmlTag,
          content: 'hello',
          rect: RECT,
        }),
      });
      const result = migrateDocumentModel(raw);
      const node = result.nodes.leaf as Record<string, unknown>;
      expect(node.htmlTag).toBe(expectedTag);
    });

    it('turns string content into a single block', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'text', content: 'hello world', rect: RECT }),
      });
      const result = migrateDocumentModel(raw);
      const node = result.nodes.leaf as { content: { blocks: unknown[] } };
      expect(node.content.blocks).toHaveLength(1);
      expect(node.content.blocks[0]).toEqual({
        type: 'paragraph',
        direction: 'ltr',
        children: [{ text: 'hello world' }],
      });
    });

    it('carries lang when present', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'text', content: 'hi', lang: 'fr', rect: RECT }),
      });
      const result = migrateDocumentModel(raw);
      expect((result.nodes.leaf as Record<string, unknown>).lang).toBe('fr');
    });

    it('omits lang when absent', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'text', content: 'hi', rect: RECT }),
      });
      const result = migrateDocumentModel(raw);
      expect((result.nodes.leaf as Record<string, unknown>).lang).toBeUndefined();
    });

    it('drops a text leaf missing rect', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'text', content: 'hi' }),
      });
      const result = migrateDocumentModel(raw);
      expect(result.nodes.leaf).toBeUndefined();
    });
  });

  describe('legacy image leaves', () => {
    it('carries src and alt when they are strings', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({
          id: 'leaf',
          type: 'leaf',
          role: 'image',
          src: 'img.png',
          alt: 'a photo',
          rect: RECT,
        }),
      });
      const result = migrateDocumentModel(raw);
      const node = result.nodes.leaf as Record<string, unknown>;
      expect(node.contentType).toBe('media');
      expect(node.src).toBe('img.png');
      expect(node.alt).toBe('a photo');
    });

    it('omits src and alt when not strings', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'image', src: 42, alt: null, rect: RECT }),
      });
      const result = migrateDocumentModel(raw);
      const node = result.nodes.leaf as Record<string, unknown>;
      expect(node.src).toBeUndefined();
      expect(node.alt).toBeUndefined();
    });

    it('drops an image leaf missing rect', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'image', src: 'img.png' }),
      });
      const result = migrateDocumentModel(raw);
      expect(result.nodes.leaf).toBeUndefined();
    });
  });

  describe('legacy link leaves', () => {
    it('prefers label over content, falling back to "Read more"', () => {
      const raw1 = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'link', label: 'Click here', content: 'ignored', rect: RECT }),
      });
      const result1 = migrateDocumentModel(raw1);
      expect((result1.nodes.leaf as { content: { blocks: { children: { text: string }[] }[] } }).content.blocks[0].children[0].text).toBe('Click here');

      const raw2 = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'link', content: 'fallback content', rect: RECT }),
      });
      const result2 = migrateDocumentModel(raw2);
      expect((result2.nodes.leaf as { content: { blocks: { children: { text: string }[] }[] } }).content.blocks[0].children[0].text).toBe('fallback content');

      const raw3 = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'link', rect: RECT }),
      });
      const result3 = migrateDocumentModel(raw3);
      expect((result3.nodes.leaf as { content: { blocks: { children: { text: string }[] }[] } }).content.blocks[0].children[0].text).toBe('Read more');
    });

    it.each([
      ['external', 'external'],
      ['page', 'page'],
      ['anchor', 'anchor'],
      ['bogus', 'external'],
    ])('normalizes linkType %s to %s', (linkType, expected) => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'link', linkType, rect: RECT }),
      });
      const result = migrateDocumentModel(raw);
      const node = result.nodes.leaf as { link: { linkType: string } };
      expect(node.link.linkType).toBe(expected);
    });

    it('has no link extension when none of linkType/href/anchorTargetId are present', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'link', rect: RECT }),
      });
      const result = migrateDocumentModel(raw);
      const node = result.nodes.leaf as Record<string, unknown>;
      expect('link' in node).toBe(false);
    });

    it('drops a link leaf missing rect', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'link', href: 'https://example.com' }),
      });
      const result = migrateDocumentModel(raw);
      expect(result.nodes.leaf).toBeUndefined();
    });

    it('builds a link extension when href is present without linkType', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'link', href: 'https://example.com', rect: RECT }),
      });
      const result = migrateDocumentModel(raw);
      const node = result.nodes.leaf as { link: { linkType: string; href: string } };
      expect(node.link.linkType).toBe('external');
      expect(node.link.href).toBe('https://example.com');
    });
  });

  describe('legacy button leaves', () => {
    it('defaults link to external/# when no link fields present', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'button', rect: RECT }),
      });
      const result = migrateDocumentModel(raw);
      const node = result.nodes.leaf as { link: { linkType: string; href: string } };
      expect(node.link).toEqual({ linkType: 'external', href: '#' });
    });

    it('prefers label over content, falling back to "Button"', () => {
      const raw1 = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'button', label: 'Buy now', content: 'ignored', rect: RECT }),
      });
      const result1 = migrateDocumentModel(raw1);
      expect((result1.nodes.leaf as { content: { blocks: { children: { text: string }[] }[] } }).content.blocks[0].children[0].text).toBe('Buy now');

      const raw2 = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'button', content: 'fallback content', rect: RECT }),
      });
      const result2 = migrateDocumentModel(raw2);
      expect((result2.nodes.leaf as { content: { blocks: { children: { text: string }[] }[] } }).content.blocks[0].children[0].text).toBe('fallback content');

      const raw3 = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'button', rect: RECT }),
      });
      const result3 = migrateDocumentModel(raw3);
      expect((result3.nodes.leaf as { content: { blocks: { children: { text: string }[] }[] } }).content.blocks[0].children[0].text).toBe('Button');
    });

    it('drops a button leaf missing rect', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'button' }),
      });
      const result = migrateDocumentModel(raw);
      expect(result.nodes.leaf).toBeUndefined();
    });

    it('uses an explicit link when link fields are present', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'button', linkType: 'page', targetPageId: 'p1', rect: RECT }),
      });
      const result = migrateDocumentModel(raw);
      const node = result.nodes.leaf as { link: { linkType: string; targetPageId: string } };
      expect(node.link.linkType).toBe('page');
      expect(node.link.targetPageId).toBe('p1');
    });
  });

  it('falls through unknown leaf roles to best-effort text migration', () => {
    const raw = docWith({
      'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
      leaf: baseRaw({ id: 'leaf', type: 'leaf', role: 'mystery', content: 'some text', rect: RECT }),
    });
    const result = migrateDocumentModel(raw);
    const node = result.nodes.leaf as Record<string, unknown>;
    expect(node.contentType).toBe('text');
    expect(node.htmlTag).toBe('p');
  });

  it('drops nodes with an unknown top-level type', () => {
    const raw = docWith({
      'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
      weird: baseRaw({ id: 'weird', type: 'mystery-type' }),
    });
    const result = migrateDocumentModel(raw);
    expect(result.nodes.weird).toBeUndefined();
  });

  describe('new-format (idempotent) nodes', () => {
    it('normalizes rich text content and strips htmlTag', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site', contentType: 'site' }),
        rich: baseRaw({
          id: 'rich',
          contentType: 'text',
          subtype: 'rich',
          htmlTag: 'h3',
          rect: RECT,
          content: [{ text: 'hello' }],
        }),
      });
      const result = migrateDocumentModel(raw);
      const node = result.nodes.rich as Record<string, unknown>;
      expect(node.content).toEqual({ blocks: [{ type: 'paragraph', children: [{ text: 'hello' }] }] });
      expect('htmlTag' in node).toBe(false);
    });

    it('produces a code block carrying language/theme and dropping derived highlightedHtml', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site', contentType: 'site' }),
        codeNode: baseRaw({
          id: 'codeNode',
          contentType: 'text',
          subtype: 'code',
          rect: RECT,
          content: 'const x = 1;',
          code: { language: 'ts', theme: 'dark', highlightedHtml: '<span>code</span>' },
        }),
      });
      const result = migrateDocumentModel(raw);
      const node = result.nodes.codeNode as unknown as { content: { blocks: Record<string, unknown>[] } };
      const block = node.content.blocks[0];
      expect(block.language).toBe('ts');
      expect(block.theme).toBe('dark');
      // highlightedHtml is derived render output, not canonical content —
      // normalization drops it, matching stripDerivedCodeHighlightsFromTextNode.
      expect(block.highlightedHtml).toBeUndefined();
    });

    it('normalizes list content into a rich list block', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site', contentType: 'site' }),
        listNode: baseRaw({
          id: 'listNode',
          contentType: 'text',
          subtype: 'list',
          rect: RECT,
          content: { type: 'ul', items: [{ text: 'item 1' }] },
        }),
      });
      const result = migrateDocumentModel(raw);
      const node = result.nodes.listNode as unknown as { content: { blocks: Record<string, unknown>[] } };
      expect(node.content.blocks[0].type).toBe('ul');
    });

    it('maps a block subtype with an explicit htmlTag', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site', contentType: 'site' }),
        blockNode: baseRaw({
          id: 'blockNode',
          contentType: 'text',
          subtype: 'block',
          htmlTag: 'h3',
          rect: RECT,
          content: 'heading text',
        }),
      });
      const result = migrateDocumentModel(raw);
      const node = result.nodes.blockNode as unknown as { content: { blocks: Record<string, unknown>[] } };
      expect(node.content.blocks[0].type).toBe('h3');
    });

    it('defaults a block subtype with no htmlTag to paragraph', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site', contentType: 'site' }),
        blockNode: baseRaw({
          id: 'blockNode',
          contentType: 'text',
          subtype: 'block',
          rect: RECT,
          content: 'plain text',
        }),
      });
      const result = migrateDocumentModel(raw);
      const node = result.nodes.blockNode as unknown as { content: { blocks: Record<string, unknown>[] } };
      expect(node.content.blocks[0].type).toBe('paragraph');
    });

    it('passes container and media new-format nodes through unchanged', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site', contentType: 'site' }),
        containerNode: baseRaw({
          id: 'containerNode',
          contentType: 'container',
          subtype: 'section',
          rect: RECT,
          style: { background: 'blue' },
        }),
        mediaNode: baseRaw({
          id: 'mediaNode',
          contentType: 'media',
          subtype: 'image',
          rect: RECT,
          src: 'photo.png',
        }),
      });
      const result = migrateDocumentModel(raw);
      expect(result.nodes.containerNode).toEqual({
        id: 'containerNode',
        parentId: 'site-root',
        children: [],
        name: 'Node',
        visible: true,
        locked: false,
        contentType: 'container',
        subtype: 'section',
        rect: RECT,
        style: { background: 'blue' },
      });
      expect(result.nodes.mediaNode).toEqual({
        id: 'mediaNode',
        parentId: 'site-root',
        children: [],
        name: 'Node',
        visible: true,
        locked: false,
        contentType: 'media',
        subtype: 'image',
        rect: RECT,
        src: 'photo.png',
      });
    });
  });

  describe('document-level behavior', () => {
    it.each([null, 42, 'str'])('throws for non-object input %p', (input) => {
      expect(() => migrateDocumentModel(input)).toThrow(
        `migrateDocumentModel: expected an object, got ${typeof input}`,
      );
    });

    it('throws when rootId is missing', () => {
      expect(() => migrateDocumentModel({ nodes: {} })).toThrow(
        'migrateDocumentModel: document is missing rootId',
      );
    });

    it('skips non-object entries in the raw nodes map', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        garbage: 'not an object',
        alsoGarbage: 42,
      });
      const result = migrateDocumentModel(raw);
      expect(result.nodes.garbage).toBeUndefined();
      expect(result.nodes.alsoGarbage).toBeUndefined();
      expect(Object.keys(result.nodes)).toEqual(['site-root']);
    });

    it('uses the object key as id when the raw id is empty or missing', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        'keyed-id': baseRaw({ id: '', type: 'wrapper', role: 'section', rect: RECT, style: {} }),
      });
      const result = migrateDocumentModel(raw);
      expect(result.nodes['keyed-id']).toBeDefined();
      expect(result.nodes['keyed-id'].id).toBe('keyed-id');
    });

    it('defaults fontLibrary when missing on input', () => {
      const raw = {
        rootId: 'site-root',
        nodes: {
          'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
        },
      };
      const result = migrateDocumentModel(raw);
      expect(result.fontLibrary).toEqual({ defaults: [], favorites: [], usedFamilies: [] });
    });

    it('carries animationSettings, pages, siteSettings, sharedRegionIds when present', () => {
      const raw = docWith(
        { 'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }) },
        {
          animationSettings: { reducedMotion: true },
          pages: [{ id: 'page-1' }],
          siteSettings: { title: 'My site' },
          sharedRegionIds: ['region-1', 'region-2'],
        },
      );
      const result = migrateDocumentModel(raw);
      expect(result.animationSettings).toEqual({ reducedMotion: true });
      expect(result.pages).toEqual([{ id: 'page-1' }]);
      expect(result.siteSettings).toEqual({ title: 'My site' });
      expect(result.sharedRegionIds).toEqual(['region-1', 'region-2']);
    });

    it('omits animationSettings, pages, siteSettings, sharedRegionIds when absent from input', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site' }),
      });
      const result = migrateDocumentModel(raw);
      expect('animationSettings' in result).toBe(false);
      expect('pages' in result).toBe(false);
      expect('siteSettings' in result).toBe(false);
      expect('sharedRegionIds' in result).toBe(false);
    });

    it('is idempotent for a mixed legacy and new-format document', () => {
      const raw = docWith(
        {
          'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site', children: ['section-1'] }),
          'section-1': baseRaw({
            id: 'section-1',
            type: 'wrapper',
            role: 'header',
            children: ['leaf-1', 'leaf-2', 'leaf-3', 'leaf-4', 'leaf-5'],
            rect: RECT,
            style: { background: 'white' },
          }),
          'leaf-1': baseRaw({
            id: 'leaf-1',
            parentId: 'section-1',
            type: 'leaf',
            role: 'image',
            src: 'photo.png',
            alt: 'A photo',
            rect: RECT,
          }),
          'leaf-2': baseRaw({
            id: 'leaf-2',
            parentId: 'section-1',
            contentType: 'text',
            subtype: 'rich',
            rect: RECT,
            content: [{ text: 'already migrated' }],
          }),
          'leaf-3': baseRaw({
            id: 'leaf-3',
            parentId: 'section-1',
            type: 'leaf',
            role: 'text',
            htmlTag: 'h2',
            content: 'legacy block text',
            rect: RECT,
          }),
          'leaf-4': baseRaw({
            id: 'leaf-4',
            parentId: 'section-1',
            contentType: 'text',
            subtype: 'code',
            rect: RECT,
            content: 'const x = 1;',
            code: { language: 'ts' },
          }),
          'leaf-5': baseRaw({
            id: 'leaf-5',
            parentId: 'section-1',
            contentType: 'text',
            subtype: 'list',
            rect: RECT,
            content: { type: 'ul', items: [{ text: 'item 1' }] },
          }),
        },
        { sharedRegionIds: ['region-1'] },
      );

      const once = migrateDocumentModel(raw);
      const twice = migrateDocumentModel(once);
      expect(twice).toEqual(once);
    });

    it('preserves block text content across a second migration pass', () => {
      const raw = docWith({
        'site-root': baseRaw({ id: 'site-root', parentId: null, type: 'site', contentType: 'site' }),
        blockNode: baseRaw({
          id: 'blockNode',
          contentType: 'text',
          subtype: 'block',
          htmlTag: 'h3',
          rect: RECT,
          content: 'heading text',
        }),
      });

      const once = migrateDocumentModel(raw);
      const twice = migrateDocumentModel(once);
      const node = twice.nodes.blockNode as unknown as {
        content: { blocks: { type: string; children: { text: string }[] }[] };
      };
      expect(node.content.blocks[0].type).toBe('h3');
      expect(node.content.blocks[0].children).toEqual([{ text: 'heading text' }]);
      expect(twice).toEqual(once);
    });

    it('migrates a full legacy document that passes validateDocument', () => {
      const raw = docWith({
        'site-root': baseRaw({
          id: 'site-root',
          parentId: null,
          type: 'site',
          children: ['section-1'],
        }),
        'section-1': baseRaw({
          id: 'section-1',
          parentId: 'site-root',
          type: 'wrapper',
          role: 'section',
          children: ['leaf-1'],
          rect: RECT,
          style: {},
        }),
        'leaf-1': baseRaw({
          id: 'leaf-1',
          parentId: 'section-1',
          type: 'leaf',
          role: 'text',
          htmlTag: 'h1',
          content: 'Welcome',
          rect: RECT,
        }),
      });

      const result = migrateDocumentModel(raw);
      const errors = validateDocument(result);
      expect(errors).toEqual([]);
    });
  });
});
