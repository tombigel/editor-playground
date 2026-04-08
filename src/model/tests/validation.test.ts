import { describe, expect, it } from 'vitest';
import { createInitialDocument, createContainerNode, createTextNode, createLinkTextNode, createButtonTextNode } from '../defaults';
import { createPage } from '../pageDefaults';
import type { ListContent, RichContent, TextNode } from '../types';
import { getMainWrappers } from '../selectors';
import { validateDocument, validateLinks } from '../validation';

function appendPage(document: ReturnType<typeof createInitialDocument>, options: Parameters<typeof createPage>[0]) {
  const page = createPage(options);
  document.pages = [...(document.pages ?? []), page];
  return { document, page };
}

describe('model/validation', () => {
  it('accepts the default document', () => {
    const document = createInitialDocument();
    expect(validateDocument(document)).toEqual([]);
  });

  it('rejects multiple headers', () => {
    const document = createInitialDocument();
    const firstSection = getMainWrappers(document)[0];
    firstSection.subtype = 'header';

    const errors = validateDocument(document);
    expect(errors).toContain('Only one header is allowed.');
  });

  it('rejects leaf nodes with children', () => {
    const document = createInitialDocument();
    const firstSection = getMainWrappers(document)[0];
    const leafId = firstSection.children.find((id) => document.nodes[id]?.contentType !== 'container' && document.nodes[id]?.contentType !== 'site');
    expect(leafId).toBeTruthy();
    if (!leafId) {
      return;
    }

    document.nodes[leafId].children.push('fake_child');
    const errors = validateDocument(document);
    expect(errors.some((error) => error.includes(`Leaf ${leafId} cannot contain children.`))).toBe(true);
  });

  it('rejects container as direct site child', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];
    if (!root || root.contentType !== 'site') {
      throw new Error('Expected site root');
    }

    const container = createContainerNode('container', root.id);
    document.nodes[container.id] = container;
    root.children.push(container.id);

    const errors = validateDocument(document);
    expect(errors.some((error) => error.includes(`Site cannot directly contain container ${container.id}.`))).toBe(true);
  });

  it('rejects nested site-section wrappers', () => {
    const document = createInitialDocument();
    const section = getMainWrappers(document)[0];
    const nestedSection = createContainerNode('section', section.id);
    document.nodes[nestedSection.id] = nestedSection;
    section.children.push(nestedSection.id);

    const errors = validateDocument(document);
    expect(errors.some((error) => error.includes(`${section.subtype} ${section.id} cannot contain section ${nestedSection.id}.`))).toBe(true);
  });

  it('rejects site containing leaves', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];
    if (!root || root.contentType !== 'site') {
      throw new Error('Expected site root');
    }
    const rogueLeaf = createTextNode('block', root.id);
    document.nodes[rogueLeaf.id] = rogueLeaf;
    root.children.push(rogueLeaf.id);

    const errors = validateDocument(document);
    expect(errors.some((error) => error.includes(`Site can only contain containers, found ${rogueLeaf.id}.`))).toBe(true);
  });

  it('rejects documents with a missing root node', () => {
    const document = createInitialDocument();
    const rootId = document.rootId;

    delete document.nodes[rootId];

    expect(validateDocument(document)).toContain(`Missing root node ${rootId}.`);
  });

  it('rejects documents whose root is not a site node', () => {
    const document = createInitialDocument();
    const firstSection = getMainWrappers(document)[0];

    document.rootId = firstSection.id;

    const errors = validateDocument(document);
    expect(errors).toContain(`Root node ${firstSection.id} must be a site.`);
  });

  it('rejects parents that reference missing child ids', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];
    if (!root || root.contentType !== 'site') {
      throw new Error('Expected site root');
    }

    root.children.push('missing_child');

    const errors = validateDocument(document);
    expect(errors).toContain(`Node ${root.id} references missing child missing_child.`);
  });

  it('rejects children that do not point back to their parent', () => {
    const document = createInitialDocument();
    const section = getMainWrappers(document)[0];
    const childId = section.children[0];
    const child = document.nodes[childId];
    if (!child || child.contentType === 'site') {
      throw new Error('Expected section child');
    }

    child.parentId = document.rootId;

    const errors = validateDocument(document);
    expect(errors).toContain(`Child ${childId} does not point back to parent ${section.id}.`);
  });

  it('rejects parents that are missing an existing child back-reference', () => {
    const document = createInitialDocument();
    const section = getMainWrappers(document)[0];
    const childId = section.children[0];
    const child = document.nodes[childId];
    if (!child || child.contentType === 'site') {
      throw new Error('Expected section child');
    }

    child.parentId = document.rootId;
    section.children = section.children.filter((id) => id !== childId);

    const errors = validateDocument(document);
    expect(errors).toContain(`Parent ${document.rootId} is missing child ${childId}.`);
  });

  it('rejects duplicate child ids and unreachable orphan nodes', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];
    if (!root || root.contentType !== 'site') {
      throw new Error('Expected site root');
    }

    const duplicateId = root.children[0];
    root.children.push(duplicateId);

    const orphan = createContainerNode('container', root.id);
    document.nodes[orphan.id] = orphan;

    const errors = validateDocument(document);
    expect(errors).toContain(`Node ${root.id} references child ${duplicateId} more than once.`);
    expect(errors).toContain(`Node ${orphan.id} is unreachable from root ${document.rootId}.`);
  });

  describe('page alias conflict validation', () => {
    it('accepts pages with non-conflicting aliases', () => {
      let doc = createInitialDocument();
      doc = appendPage(doc, { displayName: 'About', slug: 'about' }).document;
      doc = {
        ...doc,
        pages: doc.pages!.map((p) =>
          p.slug === 'about' ? { ...p, slugAliases: ['about-us'] } : p,
        ),
      };
      expect(validateDocument(doc)).toEqual([]);
    });

    it('rejects alias that duplicates own slug', () => {
      let doc = createInitialDocument();
      doc = appendPage(doc, { displayName: 'About', slug: 'about' }).document;
      doc = {
        ...doc,
        pages: doc.pages!.map((p) =>
          p.slug === 'about' ? { ...p, slugAliases: ['about'] } : p,
        ),
      };
      const errors = validateDocument(doc);
      expect(errors.some((e) => e.includes('duplicates its own slug'))).toBe(true);
    });

    it('rejects alias that conflicts with another page slug', () => {
      let doc = createInitialDocument();
      doc = appendPage(doc, { displayName: 'About', slug: 'about' }).document;
      doc = appendPage(doc, { displayName: 'Contact', slug: 'contact' }).document;
      doc = {
        ...doc,
        pages: doc.pages!.map((p) =>
          p.slug === 'contact' ? { ...p, slugAliases: ['about'] } : p,
        ),
      };
      const errors = validateDocument(doc);
      expect(errors.some((e) => e.includes('conflicts with page'))).toBe(true);
    });

    it('rejects alias that conflicts with another page alias', () => {
      let doc = createInitialDocument();
      doc = appendPage(doc, { displayName: 'About', slug: 'about' }).document;
      doc = appendPage(doc, { displayName: 'Contact', slug: 'contact' }).document;
      doc = {
        ...doc,
        pages: doc.pages!.map((p) => {
          if (p.slug === 'about') return { ...p, slugAliases: ['shared-alias'] };
          if (p.slug === 'contact') return { ...p, slugAliases: ['shared-alias'] };
          return p;
        }),
      };
      const errors = validateDocument(doc);
      expect(errors.some((e) => e.includes('conflicts with page'))).toBe(true);
    });

    it('rejects duplicate derived routes across home aliases and other pages', () => {
      let doc = createInitialDocument();
      doc = appendPage(doc, { displayName: 'About', slug: 'about', pageRole: 'home' }).document;
      doc = {
        ...doc,
        pages: doc.pages!.map((page) => {
          if (page.displayName === 'Home') {
            return { ...page, pageRole: 'default', slug: 'about' };
          }
          if (page.displayName === 'About') {
            return { ...page, pageRole: 'home' };
          }
          return page;
        }),
      };
      const errors = validateDocument(doc);
      expect(errors.some((e) => e.includes('Route "/about/" conflicts'))).toBe(true);
    });
  });

  it('accepts custom page targets on eligible top-level wrappers', () => {
    const document = createInitialDocument();
    const aboutPage = createPage({ displayName: 'About', slug: 'about' });
    document.pages = [...(document.pages ?? []), aboutPage];

    const section = getMainWrappers(document)[0];
    const homePageId = document.pages?.[0]?.id;
    if (!homePageId) {
      throw new Error('Expected home page');
    }

    const custom = structuredClone(document);
    const customSection = custom.nodes[section.id];
    if (!customSection || customSection.contentType !== 'container') {
      throw new Error('Expected wrapper node');
    }

    custom.pages = (custom.pages ?? []).map((page) => ({
      ...page,
      sectionIds: page.sectionIds.filter((sectionId) => sectionId !== section.id),
    }));
    custom.sharedRegionIds = (custom.sharedRegionIds ?? []).filter((id) => id !== section.id);
    customSection.visible = true;
    customSection.pageTargetIds = [homePageId, aboutPage.id];

    expect(validateDocument(custom)).toEqual([]);
  });

  it('rejects documents with no home page', () => {
    const document = createInitialDocument();
    document.pages = document.pages?.map((page) => ({ ...page, pageRole: 'default' }));

    expect(validateDocument(document)).toContain('Exactly one home page is required; found 0.');
  });

  it('rejects documents with multiple home pages', () => {
    let document = createInitialDocument();
    document = appendPage(document, { displayName: 'About', slug: 'about', pageRole: 'home' }).document;

    expect(validateDocument(document)).toContain('Exactly one home page is required; found 2.');
  });

  describe('page parent cycle validation', () => {
    it('accepts a valid parent–child hierarchy', () => {
      let doc = createInitialDocument();
      const parentResult = appendPage(doc, { displayName: 'Parent', slug: 'parent' });
      doc = parentResult.document;
      const childResult = appendPage(doc, { displayName: 'Child', slug: 'child' });
      doc = {
        ...childResult.document,
        pages: childResult.document.pages!.map((p) =>
          p.id === childResult.page.id ? { ...p, parentPageId: parentResult.page.id } : p,
        ),
      };
      expect(validateDocument(doc)).toEqual([]);
    });

    it('rejects a direct self-parent cycle', () => {
      let doc = createInitialDocument();
      const loopResult = appendPage(doc, { displayName: 'Looping', slug: 'loop' });
      doc = loopResult.document;
      const loopPage = loopResult.page;
      doc = {
        ...doc,
        pages: doc.pages!.map((p) =>
          p.id === loopPage.id ? { ...p, parentPageId: loopPage.id } : p,
        ),
      };
      const errors = validateDocument(doc);
      expect(errors.some((e) => e.includes('Page parent cycle detected'))).toBe(true);
    });

    it('rejects a two-page parent cycle', () => {
      let doc = createInitialDocument();
      const aResult = appendPage(doc, { displayName: 'A', slug: 'a' });
      doc = aResult.document;
      const bResult = appendPage(doc, { displayName: 'B', slug: 'b' });
      doc = bResult.document;
      const [pageA, pageB] = [aResult.page, bResult.page];
      doc = {
        ...doc,
        pages: doc.pages!.map((p) => {
          if (p.id === pageA.id) return { ...p, parentPageId: pageB.id };
          if (p.id === pageB.id) return { ...p, parentPageId: pageA.id };
          return p;
        }),
      };
      const errors = validateDocument(doc);
      expect(errors.some((e) => e.includes('Page parent cycle detected'))).toBe(true);
    });
  });

  describe('link validation', () => {
    it('reports no errors for a document with no broken links', () => {
      const doc = createInitialDocument();
      // initial document has anchor-type links with no anchorTargetId — these are
      // unconfigured, not broken, and should not produce errors
      expect(validateLinks(doc)).toEqual([]);
    });

    it('reports no errors for a valid page link', () => {
      let doc = createInitialDocument();
      const appended = appendPage(doc, { displayName: 'About', slug: 'about' });
      doc = appended.document;
      const pageId = appended.page.id;
      const section = getMainWrappers(doc)[0];
      const link = createLinkTextNode(section.id) as TextNode;
      link.link = { ...(link.link ?? { linkType: 'page' }), linkType: 'page', targetPageId: pageId };
      doc.nodes[link.id] = link;
      section.children.push(link.id);
      const errors = validateLinks(doc).filter((e) => e.nodeId === link.id);
      expect(errors).toEqual([]);
    });

    it('reports error for a page link pointing to a nonexistent page', () => {
      const doc = createInitialDocument();
      const section = getMainWrappers(doc)[0];
      const link = createLinkTextNode(section.id) as TextNode;
      link.link = { ...(link.link ?? { linkType: 'page' }), linkType: 'page', targetPageId: 'nonexistent_page_id' };
      doc.nodes[link.id] = link;
      section.children.push(link.id);
      const errors = validateLinks(doc).filter((e) => e.nodeId === link.id);
      expect(errors).toHaveLength(1);
      expect(errors[0].errorType).toBe('broken-page-link');
    });

    it('reports error for a page link with no targetPageId set', () => {
      const doc = createInitialDocument();
      const section = getMainWrappers(doc)[0];
      const link = createLinkTextNode(section.id) as TextNode;
      link.link = { ...(link.link ?? { linkType: 'page' }), linkType: 'page' };
      doc.nodes[link.id] = link;
      section.children.push(link.id);
      const errors = validateLinks(doc).filter((e) => e.nodeId === link.id);
      expect(errors).toHaveLength(1);
      expect(errors[0].errorType).toBe('broken-page-link');
      expect(errors[0].description).toMatch(/no target page/i);
    });

    it('reports error for a button with a broken page link', () => {
      const doc = createInitialDocument();
      const section = getMainWrappers(doc)[0];
      const button = createButtonTextNode(section.id) as TextNode;
      button.link = { ...(button.link ?? { linkType: 'page' }), linkType: 'page', targetPageId: 'gone_page_id' };
      doc.nodes[button.id] = button;
      section.children.push(button.id);
      const errors = validateLinks(doc).filter((e) => e.nodeId === button.id);
      expect(errors).toHaveLength(1);
      expect(errors[0].errorType).toBe('broken-page-link');
      expect(errors[0].nodeRole).toBe('button');
    });

    it('reports no errors for a valid anchor link', () => {
      const doc = createInitialDocument();
      const section = getMainWrappers(doc)[0];
      const target = createTextNode('block', section.id);
      doc.nodes[target.id] = target;
      section.children.push(target.id);
      const link = createLinkTextNode(section.id) as TextNode;
      link.link = { ...(link.link ?? { linkType: 'anchor' }), linkType: 'anchor', anchorTargetId: target.id };
      doc.nodes[link.id] = link;
      section.children.push(link.id);
      const errors = validateLinks(doc).filter((e) => e.nodeId === link.id);
      expect(errors).toEqual([]);
    });

    it('reports error for an anchor link pointing to a nonexistent node', () => {
      const doc = createInitialDocument();
      const section = getMainWrappers(doc)[0];
      const link = createLinkTextNode(section.id) as TextNode;
      link.link = { ...(link.link ?? { linkType: 'anchor' }), linkType: 'anchor', anchorTargetId: 'nonexistent_node_id' };
      doc.nodes[link.id] = link;
      section.children.push(link.id);
      const errors = validateLinks(doc).filter((e) => e.nodeId === link.id);
      expect(errors).toHaveLength(1);
      expect(errors[0].errorType).toBe('broken-anchor-link');
    });

    it('does not report an error for an anchor link with no anchorTargetId set', () => {
      const doc = createInitialDocument();
      const section = getMainWrappers(doc)[0];
      const link = createLinkTextNode(section.id) as TextNode;
      link.link = { ...(link.link ?? { linkType: 'anchor' }), linkType: 'anchor', anchorTargetId: undefined };
      doc.nodes[link.id] = link;
      section.children.push(link.id);
      // unconfigured anchor links are not flagged — only explicitly broken ones are
      const errors = validateLinks(doc).filter((e) => e.nodeId === link.id);
      expect(errors).toHaveLength(0);
    });

    it('reports error for a page link with a missing pageAnchorId', () => {
      let doc = createInitialDocument();
      const appended = appendPage(doc, { displayName: 'About', slug: 'about' });
      doc = appended.document;
      const pageId = appended.page.id;
      const section = getMainWrappers(doc)[0];
      const link = createLinkTextNode(section.id) as TextNode;
      link.link = { ...(link.link ?? { linkType: 'page' }), linkType: 'page', targetPageId: pageId, pageAnchorId: 'nonexistent_anchor_id' };
      doc.nodes[link.id] = link;
      section.children.push(link.id);
      const errors = validateLinks(doc).filter((e) => e.nodeId === link.id);
      expect(errors).toHaveLength(1);
      expect(errors[0].errorType).toBe('broken-anchor-link');
    });

    it('ignores external links and text/image nodes', () => {
      const doc = createInitialDocument();
      const section = getMainWrappers(doc)[0];
      const link = createLinkTextNode(section.id) as TextNode;
      link.link = { ...(link.link ?? { linkType: 'external' }), linkType: 'external', href: 'https://example.com' };
      doc.nodes[link.id] = link;
      section.children.push(link.id);
      const errors = validateLinks(doc).filter((e) => e.nodeId === link.id);
      expect(errors).toEqual([]);
    });

    it('reports multiple errors across multiple broken links', () => {
      const doc = createInitialDocument();
      const section = getMainWrappers(doc)[0];
      const link1 = createLinkTextNode(section.id) as TextNode;
      link1.link = { ...(link1.link ?? { linkType: 'page' }), linkType: 'page', targetPageId: 'missing_page_1' };
      doc.nodes[link1.id] = link1;
      section.children.push(link1.id);
      const link2 = createButtonTextNode(section.id) as TextNode;
      link2.link = { ...(link2.link ?? { linkType: 'page' }), linkType: 'page', targetPageId: 'missing_page_2' };
      doc.nodes[link2.id] = link2;
      section.children.push(link2.id);
      const errors = validateLinks(doc).filter(
        (e) => e.nodeId === link1.id || e.nodeId === link2.id,
      );
      expect(errors).toHaveLength(2);
    });

    it('reports no errors for a rich text node with valid inline links', () => {
      let doc = createInitialDocument();
      const appended = appendPage(doc, { displayName: 'About', slug: 'about' });
      doc = appended.document;
      const section = getMainWrappers(doc)[0];
      const rich = createTextNode('rich', section.id) as TextNode;
      rich.content = [
        {
          type: 'paragraph',
          children: [
            { text: 'Visit ' },
            { type: 'link', linkType: 'page', targetPageId: appended.page.id, children: [{ text: 'About' }] },
          ],
        },
      ] as RichContent;
      doc.nodes[rich.id] = rich;
      section.children.push(rich.id);
      const errors = validateLinks(doc).filter((e) => e.nodeId === rich.id);
      expect(errors).toEqual([]);
    });

    it('reports broken-page-link for a rich text node with an inline link to a missing page', () => {
      const doc = createInitialDocument();
      const section = getMainWrappers(doc)[0];
      const rich = createTextNode('rich', section.id) as TextNode;
      rich.content = [
        {
          type: 'paragraph',
          children: [
            { type: 'link', linkType: 'page', targetPageId: 'nonexistent-page', children: [{ text: 'Gone' }] },
          ],
        },
      ] as RichContent;
      doc.nodes[rich.id] = rich;
      section.children.push(rich.id);
      const errors = validateLinks(doc).filter((e) => e.nodeId === rich.id);
      expect(errors).toHaveLength(1);
      expect(errors[0].errorType).toBe('broken-page-link');
      expect(errors[0].nodeRole).toBe('link');
    });

    it('reports broken-anchor-link for a rich text node with an inline anchor to a missing node', () => {
      const doc = createInitialDocument();
      const section = getMainWrappers(doc)[0];
      const rich = createTextNode('rich', section.id) as TextNode;
      rich.content = [
        {
          type: 'paragraph',
          children: [
            { type: 'link', linkType: 'anchor', anchorTargetId: 'nonexistent-node', children: [{ text: 'Anchor' }] },
          ],
        },
      ] as RichContent;
      doc.nodes[rich.id] = rich;
      section.children.push(rich.id);
      const errors = validateLinks(doc).filter((e) => e.nodeId === rich.id);
      expect(errors).toHaveLength(1);
      expect(errors[0].errorType).toBe('broken-anchor-link');
    });

    it('reports broken-page-link for a list item link to a missing page', () => {
      const doc = createInitialDocument();
      const section = getMainWrappers(doc)[0];
      const list = createTextNode('list', section.id) as TextNode;
      list.content = {
        type: 'ul',
        markerStyle: 'disc',
        items: [{ text: 'Go', direction: 'ltr', link: { linkType: 'page', targetPageId: 'missing-page' } }],
      } as ListContent;
      doc.nodes[list.id] = list;
      section.children.push(list.id);

      const errors = validateLinks(doc).filter((e) => e.nodeId === list.id);
      expect(errors).toHaveLength(1);
      expect(errors[0].errorType).toBe('broken-page-link');
    });
  });

  it('rejects cycles in the node graph', () => {
    const document = createInitialDocument();
    const section = getMainWrappers(document)[0];
    const container = createContainerNode('container', section.id);
    document.nodes[container.id] = container;
    section.children.push(container.id);

    container.children.push(section.id);
    section.parentId = container.id;

    const errors = validateDocument(document);
    expect(errors).toContain(`Cycle detected at node ${section.id}.`);
  });

  it('rejects rich text with free inline root content', () => {
    const document = createInitialDocument();
    const section = getMainWrappers(document)[0];
    const rich = createTextNode('rich', section.id) as TextNode;
    rich.content = [{ text: 'orphan root leaf' }] as unknown as RichContent;
    document.nodes[rich.id] = rich;
    section.children.push(rich.id);

    const errors = validateDocument(document);
    expect(errors).toContain(`Rich text node ${rich.id}: Rich content root item 0 must be a block.`);
  });

  it('rejects malformed list content', () => {
    const document = createInitialDocument();
    const section = getMainWrappers(document)[0];
    const list = createTextNode('list', section.id) as TextNode;
    list.content = { type: 'ol', items: [{ value: 'missing-text' }] } as unknown as ListContent;
    document.nodes[list.id] = list;
    section.children.push(list.id);

    const errors = validateDocument(document);
    expect(errors).toContain(`List node ${list.id}: List item 0 must define a string text value.`);
  });
});
