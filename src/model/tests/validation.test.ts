import { describe, expect, it } from 'vitest';
import { addPage, setPageParent } from '../../api/pageApi';
import { createInitialDocument, createLeaf, createWrapper } from '../defaults';
import { getMainWrappers } from '../selectors';
import { validateDocument } from '../validation';

describe('model/validation', () => {
  it('accepts the default document', () => {
    const document = createInitialDocument();
    expect(validateDocument(document)).toEqual([]);
  });

  it('rejects multiple headers', () => {
    const document = createInitialDocument();
    const firstSection = getMainWrappers(document)[0];
    firstSection.role = 'header';

    const errors = validateDocument(document);
    expect(errors).toContain('Only one header is allowed.');
  });

  it('rejects leaf nodes with children', () => {
    const document = createInitialDocument();
    const firstSection = getMainWrappers(document)[0];
    const leafId = firstSection.children.find((id) => document.nodes[id]?.type === 'leaf');
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
    if (!root || root.type !== 'site') {
      throw new Error('Expected site root');
    }

    const container = createWrapper('container', root.id);
    document.nodes[container.id] = container;
    root.children.push(container.id);

    const errors = validateDocument(document);
    expect(errors.some((error) => error.includes(`Site cannot directly contain container ${container.id}.`))).toBe(true);
  });

  it('rejects nested site-section wrappers', () => {
    const document = createInitialDocument();
    const section = getMainWrappers(document)[0];
    const nestedSection = createWrapper('section', section.id);
    document.nodes[nestedSection.id] = nestedSection;
    section.children.push(nestedSection.id);

    const errors = validateDocument(document);
    expect(errors.some((error) => error.includes(`${section.role} ${section.id} cannot contain section ${nestedSection.id}.`))).toBe(true);
  });

  it('rejects site containing leaves', () => {
    const document = createInitialDocument();
    const root = document.nodes[document.rootId];
    if (!root || root.type !== 'site') {
      throw new Error('Expected site root');
    }
    const rogueLeaf = createLeaf('text', root.id);
    document.nodes[rogueLeaf.id] = rogueLeaf;
    root.children.push(rogueLeaf.id);

    const errors = validateDocument(document);
    expect(errors.some((error) => error.includes(`Site can only contain wrappers, found ${rogueLeaf.id}.`))).toBe(true);
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
    if (!root || root.type !== 'site') {
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
    if (!child || child.type === 'site') {
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
    if (!child || child.type === 'site') {
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
    if (!root || root.type !== 'site') {
      throw new Error('Expected site root');
    }

    const duplicateId = root.children[0];
    root.children.push(duplicateId);

    const orphan = createWrapper('container', root.id);
    document.nodes[orphan.id] = orphan;

    const errors = validateDocument(document);
    expect(errors).toContain(`Node ${root.id} references child ${duplicateId} more than once.`);
    expect(errors).toContain(`Node ${orphan.id} is unreachable from root ${document.rootId}.`);
  });

  describe('page alias conflict validation', () => {
    it('accepts pages with non-conflicting aliases', () => {
      let doc = createInitialDocument();
      doc = addPage(doc, { displayName: 'About', slug: 'about' });
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
      doc = addPage(doc, { displayName: 'About', slug: 'about' });
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
      doc = addPage(doc, { displayName: 'About', slug: 'about' });
      doc = addPage(doc, { displayName: 'Contact', slug: 'contact' });
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
      doc = addPage(doc, { displayName: 'About', slug: 'about' });
      doc = addPage(doc, { displayName: 'Contact', slug: 'contact' });
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
  });

  describe('page parent cycle validation', () => {
    it('accepts a valid parent–child hierarchy', () => {
      let doc = createInitialDocument();
      doc = addPage(doc, { displayName: 'Parent', slug: 'parent' });
      const parentPage = doc.pages![1];
      doc = addPage(doc, { displayName: 'Child', slug: 'child' });
      const childPage = doc.pages![2];
      doc = setPageParent(doc, childPage.id, parentPage.id);
      expect(validateDocument(doc)).toEqual([]);
    });

    it('rejects a direct self-parent cycle', () => {
      let doc = createInitialDocument();
      doc = addPage(doc, { displayName: 'Looping', slug: 'loop' });
      const loopPage = doc.pages![1];
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
      doc = addPage(doc, { displayName: 'A', slug: 'a' });
      doc = addPage(doc, { displayName: 'B', slug: 'b' });
      const [pageA, pageB] = [doc.pages![1], doc.pages![2]];
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

  it('rejects cycles in the node graph', () => {
    const document = createInitialDocument();
    const section = getMainWrappers(document)[0];
    const container = createWrapper('container', section.id);
    document.nodes[container.id] = container;
    section.children.push(container.id);

    container.children.push(section.id);
    section.parentId = container.id;

    const errors = validateDocument(document);
    expect(errors).toContain(`Cycle detected at node ${section.id}.`);
  });
});
