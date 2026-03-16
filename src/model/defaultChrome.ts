import type { NodeId } from './types';
import { createDefaultRect, createWrapper } from './defaultFactories';
import { applyPadding, buildTemplate, createLinkNode, createTextNode } from './templateHelpers';

export function createDefaultHeader(parentId: NodeId) {
  const header = createWrapper('header', parentId);
  header.name = 'Playground Header';
  header.rect = createDefaultRect('0px', '0px', '100%', 'auto');
  header.style.background = '#f8fbff';
  header.style.borderColor = '#d6e2f2';
  applyPadding(header, { top: '20px', right: '48px', bottom: '20px' });

  const headerLogo = createTextNode(header.id, {
    name: 'Product Title',
    content: 'Sticky Playground',
    x: '62px',
    y: '25.5px',
    width: 'fit-content',
    style: { color: '#0f172a', fontSize: '20px', fontWeight: 'bold', htmlTag: 'h1' },
  });

  const headerSubtitle = createTextNode(header.id, {
    name: 'Product Subtitle',
    content: 'Model, preview, and validate sticky behavior before implementation.',
    x: '61px',
    y: '60px',
    width: 'fit-content',
    style: { color: '#516174', fontSize: '14px' },
  });

  const navTemplates = createLinkNode(header.id, {
    name: 'Templates Link',
    label: 'Templates',
    x: '836px',
    y: '48px',
    width: 'fit-content',
  });

  const navSticky = createLinkNode(header.id, {
    name: 'Sticky Demos Link',
    label: 'Sticky Demos',
    x: '947px',
    y: '48px',
    width: 'fit-content',
  });

  const navTests = createLinkNode(header.id, {
    name: 'Test Plan Link',
    label: 'Test Plan',
    x: '1082px',
    y: '48px',
    width: '144px',
    height: '24px',
  });

  return buildTemplate(header, [headerLogo, headerSubtitle, navTemplates, navSticky, navTests]);
}

export function createDefaultFooter(parentId: NodeId) {
  const footer = createWrapper('footer', parentId);
  footer.name = 'Playground Footer';
  footer.rect = createDefaultRect('0px', '0px', '100%', 'auto');
  footer.style.background = '#f8fbff';
  footer.style.borderColor = '#d6e2f2';
  applyPadding(footer, { top: '26px', right: '48px', bottom: '26px' });

  const footerTitle = createTextNode(footer.id, {
    name: 'Footer Title',
    content: 'Sticky Playground',
    x: '67px',
    y: '28px',
    width: 'fit-content',
    style: { color: '#0f172a', fontSize: '16px', fontWeight: 'bold', lineHeight: 1.2, htmlTag: 'h2' },
  });

  const footerCopy = createTextNode(footer.id, {
    name: 'Footer Copy',
    content: 'A prototyping surface for sticky logic, spacing strategy, and interaction QA.',
    x: '64px',
    y: '53px',
    width: '271px',
    height: '38px',
    style: { color: '#475569', fontSize: '14px', lineHeight: 1.3 },
  });

  const footerLink = createLinkNode(footer.id, {
    name: 'Repository Link',
    label: 'github.com/tombigel/sticky-playground',
    href: 'https://github.com/tombigel/sticky-playground',
    x: '866px',
    y: '48px',
    width: '322px',
    height: '24px',
  });

  return buildTemplate(footer, [footerTitle, footerCopy, footerLink]);
}
