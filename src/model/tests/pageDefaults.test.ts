import { describe, expect, it } from 'vitest';
import { normalizeSlug, generateSlug, createPage } from '../pageDefaults';

describe('model/pageDefaults', () => {
  describe('normalizeSlug', () => {
    it('lowercases the input', () => {
      expect(normalizeSlug('UPPERCASE')).toBe('uppercase');
      expect(normalizeSlug('MiXeD')).toBe('mixed');
    });

    it('replaces spaces with hyphens', () => {
      expect(normalizeSlug('hello world')).toBe('hello-world');
      expect(normalizeSlug('a b c')).toBe('a-b-c');
    });

    it('collapses multiple consecutive hyphens into single hyphens', () => {
      expect(normalizeSlug('hello--world')).toBe('hello-world');
      expect(normalizeSlug('a---b')).toBe('a-b');
    });

    it('strips leading and trailing hyphens', () => {
      expect(normalizeSlug('-hello-world-')).toBe('hello-world');
      expect(normalizeSlug('--test--')).toBe('test');
    });

    it('handles special characters', () => {
      expect(normalizeSlug('hello!world')).toMatch(/^[a-z0-9-]+$/);
      expect(normalizeSlug('test@page#123')).toMatch(/^[a-z0-9-]+$/);
      expect(normalizeSlug('hello&world')).toMatch(/^[a-z0-9-]+$/);
    });

    it('handles combined edge cases', () => {
      expect(normalizeSlug('--Hello  WORLD!--')).toBe('hello-world');
      expect(normalizeSlug('   Test  Page  ')).toBe('test-page');
    });
  });

  describe('generateSlug', () => {
    it('delegates to normalizeSlug for slug generation', () => {
      expect(generateSlug('About Us')).toBe('about-us');
      expect(generateSlug('Home')).toBe('home');
    });

    it('produces valid slugs from display names with special characters', () => {
      expect(generateSlug('My Blog Post!')).toBe('my-blog-post');
      expect(generateSlug('FAQ & Support')).toMatch(/^[a-z0-9-]+$/);
    });

    it('produces valid slugs from display names with multiple spaces', () => {
      expect(generateSlug('Hello   World')).toBe('hello-world');
    });

    it('produces valid slugs from mixed case display names', () => {
      expect(generateSlug('CONTACT US')).toBe('contact-us');
      expect(generateSlug('Contact-Us')).toBe('contact-us');
    });
  });

  describe('createPage', () => {
    it('creates a page with type "page"', () => {
      const page = createPage();
      expect(page.type).toBe('page');
    });

    it('creates a page with a unique id string', () => {
      const page1 = createPage();
      const page2 = createPage();
      expect(typeof page1.id).toBe('string');
      expect(page1.id).toBeTruthy();
      expect(page1.id).not.toBe(page2.id);
    });

    it('creates a page with visible: true by default', () => {
      const page = createPage();
      expect(page.visible).toBe(true);
    });

    it('creates a page with empty sectionIds array by default', () => {
      const page = createPage();
      expect(page.sectionIds).toEqual([]);
    });

    it('generates slug from default displayName', () => {
      const page = createPage();
      expect(page.slug).toBeDefined();
      expect(typeof page.slug).toBe('string');
      expect(page.slug).toMatch(/^[a-z0-9-]+$/);
    });

    it('creates a page with custom displayName and matching slug', () => {
      const page = createPage({ displayName: 'About Us' });
      expect(page.displayName).toBe('About Us');
      expect(page.slug).toBe('about-us');
    });

    it('uses provided slug when specified', () => {
      const page = createPage({ slug: 'custom' });
      expect(page.slug).toBe('custom');
    });

    it('uses provided slug even when displayName is also provided', () => {
      const page = createPage({ displayName: 'About Us', slug: 'custom-slug' });
      expect(page.slug).toBe('custom-slug');
    });

    it('generates different ids for multiple createPage() calls', () => {
      const page1 = createPage();
      const page2 = createPage();
      const page3 = createPage();
      expect(page1.id).not.toBe(page2.id);
      expect(page2.id).not.toBe(page3.id);
      expect(page1.id).not.toBe(page3.id);
    });
  });
});
