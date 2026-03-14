import type {
  DocumentModel,
  ButtonLeaf,
  ImageLeaf,
  NodeId,
  LinkLeaf,
  StickyDefinition,
  TextLeaf,
  WrapperNode,
  WrapperRole,
} from './types';
import { parseHeightValue, parseUnitValue, parseWidthValue } from './units';

let counter = 0;
let imageCounter = 0;

const IMAGE_SOURCES = [
  {
    src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    alt: 'Golden desert dunes under soft sunlight',
  },
  {
    src: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80',
    alt: 'Mist rising over a calm mountain lake',
  },
  {
    src: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    alt: 'Modern interior with natural light and textured seating',
  },
];

const BRAND_MARK_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="112" height="30" viewBox="0 0 112 30" fill="none">
      <defs>
        <linearGradient id="gumFill" x1="10" y1="5" x2="100" y2="25" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FDE68A"/>
          <stop offset="0.55" stop-color="#F7C97D"/>
          <stop offset="1" stop-color="#E7A95D"/>
        </linearGradient>
        <linearGradient id="gumHighlight" x1="24" y1="8" x2="82" y2="20" gradientUnits="userSpaceOnUse">
          <stop stop-color="rgba(255,255,255,0.85)"/>
          <stop offset="1" stop-color="rgba(255,255,255,0)"/>
        </linearGradient>
        <filter id="gumShadow" x="0" y="0" width="112" height="30" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.4" flood-color="#B97A35" flood-opacity="0.18"/>
        </filter>
      </defs>
      <g filter="url(#gumShadow)">
        <path
          d="M12.4 9.8C15.6 6.9 20.9 6.6 26.8 7.4L40.2 9.3C47.5 10.4 53.7 10.4 61.2 9.1L78.2 6.2C86.5 4.8 95.2 5.9 100.2 9.3C104.2 12.1 104.8 16.6 101.8 19.8C98.7 23.1 92.6 24.7 85.4 24.3L61.3 23C53.7 22.6 46.3 22.8 38.8 23.6L25.9 24.9C18.8 25.6 12.7 24.4 9.4 21.2C6.2 18.2 6.7 13.9 12.4 9.8Z"
          fill="url(#gumFill)"
        />
        <path
          d="M27 10.3C37.4 12.5 49.9 12.8 61.7 10.8L82.6 7.1C88.1 6.1 93.6 6.5 97.3 8.1C94.4 6.1 89.9 5.3 85.5 5.9L61.4 9.2C53.7 10.2 46.2 10.1 38.6 8.9L24.2 6.7C19.3 6 14.9 6.7 12.2 8.7C16.1 6.9 21.5 7.6 27 10.3Z"
          fill="url(#gumHighlight)"
          opacity="0.9"
        />
      </g>
    </svg>
  `);

export function createDefaultHeader(parentId: NodeId) {
  const header = createWrapper('header', parentId);
  header.name = 'Primary Header';
  header.rect = createDefaultRect('0px', '0px', '100%', 'auto');
  header.style.borderColor = '#e5ebf3';
  header.style.paddingTop = parseUnitValue('24px');
  header.style.paddingRight = parseUnitValue('40px');
  header.style.paddingBottom = parseUnitValue('24px');
  header.style.paddingLeft = parseUnitValue('40px');

  const headerLogo = createLeaf('text', header.id) as TextLeaf;
  headerLogo.name = 'Brand Name';
  headerLogo.content = 'Business Name';
  headerLogo.rect = createDefaultRect('56px', '4px', 'fit-content', 'auto');
  headerLogo.style ??= {};
  headerLogo.style.color = '#0f172a';
  headerLogo.style.fontSize = parseUnitValue('16px');

  const headerMark = createLeaf('image', header.id) as ImageLeaf;
  headerMark.name = 'Brand Mark';
  headerMark.src = BRAND_MARK_SRC;
  headerMark.alt = 'Sticky gum brand mark';
  headerMark.rect = createDefaultRect('0px', '2px', '112px', '30px');

  const headerLink = createLeaf('link', header.id) as LinkLeaf;
  headerLink.name = 'Nav Link';
  headerLink.label = 'Home';
  headerLink.rect = createDefaultRect('1110px', '4px', 'fit-content', 'auto');

  header.children = [headerMark.id, headerLogo.id, headerLink.id];

  return {
    wrapper: header,
    nodes: {
      [header.id]: header,
      [headerMark.id]: headerMark,
      [headerLogo.id]: headerLogo,
      [headerLink.id]: headerLink,
    },
  };
}

export function createDefaultFooter(parentId: NodeId) {
  const footer = createWrapper('footer', parentId);
  footer.name = 'Footer';
  footer.rect = createDefaultRect('0px', '0px', '100%', 'auto');
  footer.style.borderColor = '#e5ebf3';
  footer.style.paddingTop = parseUnitValue('28px');
  footer.style.paddingRight = parseUnitValue('40px');
  footer.style.paddingBottom = parseUnitValue('28px');
  footer.style.paddingLeft = parseUnitValue('40px');

  const footerCopy = createLeaf('text', footer.id) as TextLeaf;
  footerCopy.name = 'Footer Copy';
  footerCopy.content = '\u00A9 2035 by Business Name. Built for sticky exploration.';
  footerCopy.rect = createDefaultRect('0px', '0px', 'fit-content', 'auto');
  footerCopy.style ??= {};
  footerCopy.style.color = '#475569';
  footerCopy.style.fontSize = parseUnitValue('16px');
  footer.children = [footerCopy.id];

  return {
    wrapper: footer,
    nodes: {
      [footer.id]: footer,
      [footerCopy.id]: footerCopy,
    },
  };
}

export function nextId(prefix: string): NodeId {
  counter += 1;
  return `${prefix}_${counter}`;
}

export function createDefaultSticky(): StickyDefinition {
  return {
    enabled: true,
    target: 'self',
    edges: { top: true, bottom: false },
    duration: parseUnitValue('50vh'),
  };
}

export function createDefaultRect(x = '24px', y = '24px', width = '240px', height = '80px') {
  return {
    x: { base: parseUnitValue(x) },
    y: { base: parseUnitValue(y) },
    width: { base: parseWidthValue(width) },
    height: { base: parseHeightValue(height) },
  };
}

export function createWrapper(role: WrapperRole, parentId: NodeId): WrapperNode {
  const name = role[0].toUpperCase() + role.slice(1);
  return {
    id: nextId(role),
    type: 'wrapper',
    role,
    parentId,
    children: [],
    name,
    visible: true,
    locked: false,
    rect:
      role === 'container'
        ? createDefaultRect('48px', '48px', '360px', '240px')
        : createDefaultRect('0px', '0px', '100%', '480px'),
    style: {
      background: '#ffffff',
      borderColor: '#b6c2d1',
      borderWidth: parseUnitValue('1px'),
      paddingTop: parseUnitValue('16px'),
      paddingRight: parseUnitValue('16px'),
      paddingBottom: parseUnitValue('16px'),
      paddingLeft: parseUnitValue('16px'),
    },
  };
}

export function createLeaf(
  role: 'text' | 'image' | 'link' | 'button',
  parentId: NodeId,
): TextLeaf | ImageLeaf | LinkLeaf | ButtonLeaf {
  const id = nextId(role);
  const base = {
    id,
    type: 'leaf' as const,
    parentId,
    children: [],
    visible: true,
    locked: false,
  };

  if (role === 'text') {
    return {
      ...base,
      role: 'text',
      name: 'Text',
      rect: createDefaultRect('32px', '32px', 'fit-content', 'auto'),
      content: 'Edit text',
      sticky: undefined,
      style: {
        color: '#16202a',
        fontSize: parseUnitValue('18px'),
      },
    };
  }

  if (role === 'image') {
    const image = IMAGE_SOURCES[imageCounter % IMAGE_SOURCES.length];
    imageCounter += 1;
    return {
      ...base,
      role: 'image',
      name: 'Image',
      rect: createDefaultRect('32px', '32px', '320px', 'aspect-ratio(4/3)'),
      src: image.src,
      alt: image.alt,
      sticky: undefined,
    };
  }

  if (role === 'link') {
    return {
      ...base,
      role: 'link',
      name: 'Link',
      rect: createDefaultRect('32px', '32px', 'fit-content', 'auto'),
      label: 'Read more',
      href: '#',
      sticky: undefined,
    };
  }

  return {
    ...base,
    role: 'button',
    name: 'Button',
    rect: createDefaultRect('32px', '32px', 'fit-content', 'auto'),
    label: 'Button',
    sticky: undefined,
  };
}

export function createInitialDocument(): DocumentModel {
  const siteId = nextId('site');
  const { wrapper: header, nodes: headerNodes } = createDefaultHeader(siteId);

  const hero = createWrapper('section', siteId);
  hero.name = 'Hero Section';
  hero.rect = createDefaultRect('0px', '0px', '100%', '720px');
  hero.style.paddingTop = parseUnitValue('56px');
  hero.style.paddingRight = parseUnitValue('72px');
  hero.style.paddingBottom = parseUnitValue('56px');
  hero.style.paddingLeft = parseUnitValue('72px');

  const heroImage = createLeaf('image', hero.id) as ImageLeaf;
  heroImage.name = 'Hero Image';
  heroImage.rect = createDefaultRect('48px', '96px', '340px', 'aspect-ratio(4/3)');

  const heroButton = createLeaf('button', hero.id) as ButtonLeaf;
  heroButton.name = 'Primary Button';
  heroButton.label = 'Send';
  heroButton.rect = createDefaultRect('540px', '110px', 'fit-content', 'auto');

  const heroHeading = createLeaf('text', hero.id) as TextLeaf;
  heroHeading.name = 'Headline';
  heroHeading.content = 'Design sticky behavior with confidence';
  heroHeading.rect = createDefaultRect('540px', '220px', 'fit-content', 'auto');
  heroHeading.style ??= {};
  heroHeading.style.color = '#081121';
  heroHeading.style.fontSize = parseUnitValue('68px');

  const heroCopy = createLeaf('text', hero.id) as TextLeaf;
  heroCopy.name = 'Body Copy';
  heroCopy.content =
    'Build layout and sticky interactions in one place, preview spacer behavior, and evolve the model before wiring scroll-driven animations.';
  heroCopy.rect = createDefaultRect('544px', '430px', '520px', 'auto');
  heroCopy.style ??= {};
  heroCopy.style.color = '#334155';
  heroCopy.style.fontSize = parseUnitValue('24px');

  hero.children = [heroImage.id, heroButton.id, heroHeading.id, heroCopy.id];

  const { wrapper: footer, nodes: footerNodes } = createDefaultFooter(siteId);

  return {
    rootId: siteId,
    nodes: {
      [siteId]: {
        id: siteId,
        type: 'site',
        parentId: null,
        children: [header.id, hero.id, footer.id],
        name: 'Site',
        visible: true,
        locked: false,
      },
      ...headerNodes,
      [hero.id]: hero,
      [heroImage.id]: heroImage,
      [heroButton.id]: heroButton,
      [heroHeading.id]: heroHeading,
      [heroCopy.id]: heroCopy,
      ...footerNodes,
    },
  };
}
