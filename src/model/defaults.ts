import type {
  DocumentModel,
  DocumentNode,
  ButtonLeaf,
  ImageLeaf,
  NodeId,
  LinkLeaf,
  StickyDefinition,
  TextLeaf,
  WrapperNode,
  WrapperRole,
} from './types';
import type {
  BoxPadding,
  ImageNodeConfig,
  LinkNodeConfig,
  RectConfig,
  SectionTemplateId,
  SectionTemplateSummary,
  TemplateBuild,
  TemplateNode,
  TextNodeConfig,
  TextStyleOptions,
} from './types/defaults';
import { parseFontSizeValue, parseHeightValue, parseUnitValue, parseWidthValue } from './units';

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

export type { SectionTemplateId, SectionTemplateSummary } from './types/defaults';

export const SECTION_TEMPLATES: readonly SectionTemplateSummary[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Empty section canvas for custom layout.',
    category: 'basic',
  },
  {
    id: 'post',
    name: 'Post',
    description: 'Image + title + text starter layout.',
    category: 'basic',
  },
  {
    id: 'stickyStaggeredImages',
    name: 'Sticky Staggered Images',
    description: 'Four sticky images with staggered offsets and durations.',
    category: 'sticky',
  },
  {
    id: 'stickyPinnedCards',
    name: 'Sticky Pinned Cards',
    description: 'Pinned lead column with progressive narrative cards.',
    category: 'sticky',
  },
  {
    id: 'stickyMediaReveal',
    name: 'Sticky Media Reveal',
    description: 'Pinned media with layered reveal background and right-side narrative.',
    category: 'sticky',
  },
  {
    id: 'stickySteps',
    name: 'Sticky Edge Lab',
    description: 'Compare top, both, and bottom sticky behavior in one section.',
    category: 'sticky',
  },
];

function applyPadding(
  node: Pick<WrapperNode, 'style'>,
  { top, right, bottom, left = right }: BoxPadding,
) {
  node.style.paddingTop = parseUnitValue(top);
  node.style.paddingRight = parseUnitValue(right);
  node.style.paddingBottom = parseUnitValue(bottom);
  node.style.paddingLeft = parseUnitValue(left);
}

function createTemplateSection(
  parentId: NodeId,
  name: string,
  height: string,
  padding: BoxPadding,
) {
  const section = createWrapper('section', parentId);
  section.name = name;
  section.rect = createDefaultRect('0px', '0px', '100%', height);
  applyPadding(section, padding);
  return section;
}

function setChildren(parent: Pick<WrapperNode, 'children'>, children: TemplateNode[]) {
  parent.children = children.map((child) => child.id);
}

function createNodeMap(...nodes: TemplateNode[]) {
  return Object.fromEntries(nodes.map((node) => [node.id, node])) as Record<NodeId, DocumentNode>;
}

function buildTemplate(
  wrapper: WrapperNode,
  children: TemplateNode[] = [],
  extraNodes: TemplateNode[] = [],
): TemplateBuild {
  if (children.length > 0) {
    setChildren(wrapper, children);
  }

  return {
    wrapper,
    nodes: createNodeMap(wrapper, ...children, ...extraNodes),
  };
}

function createTextNode(parentId: NodeId, config: TextNodeConfig) {
  const text = createLeaf('text', parentId) as TextLeaf;
  text.name = config.name;
  text.content = config.content;
  text.rect = createDefaultRect(config.x, config.y, config.width, config.height ?? 'auto');
  if (config.style) {
    styleText(text, config.style);
  }
  return text;
}

function createLinkNode(parentId: NodeId, config: LinkNodeConfig) {
  const link = createLeaf('link', parentId) as LinkLeaf;
  link.name = config.name;
  link.label = config.label;
  link.href = config.href ?? link.href;
  link.rect = createDefaultRect(config.x, config.y, config.width, config.height ?? 'auto');
  return link;
}

function createImageNode(parentId: NodeId, config: ImageNodeConfig) {
  const image = createLeaf('image', parentId) as ImageLeaf;
  image.name = config.name;
  image.rect = createDefaultRect(config.x, config.y, config.width, config.height ?? 'auto');
  if (config.src) {
    image.src = config.src;
  }
  if (config.alt) {
    image.alt = config.alt;
  }
  if (config.sticky) {
    image.sticky = config.sticky;
  }
  return image;
}

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

export function nextId(prefix: string): NodeId {
  counter += 1;
  return `${prefix}_${counter}`;
}

export function syncIdCountersWithDocument(document: DocumentModel) {
  let maxIdCounter = counter;
  let imageCount = 0;

  for (const node of Object.values(document.nodes)) {
    const match = node.id.match(/_(\d+)$/);
    if (match) {
      const value = Number.parseInt(match[1], 10);
      if (Number.isFinite(value)) {
        maxIdCounter = Math.max(maxIdCounter, value);
      }
    }
    if (node.type === 'leaf' && node.role === 'image') {
      imageCount += 1;
    }
  }

  counter = Math.max(counter, maxIdCounter);
  imageCounter = Math.max(imageCounter, imageCount);
}

export function createDefaultSticky(): StickyDefinition {
  return {
    enabled: true,
    target: 'self',
    edges: { top: true, bottom: false },
    duration: parseUnitValue('50vh'),
    durationTop: parseUnitValue('50vh'),
    durationBottom: parseUnitValue('50vh'),
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
      htmlTag: 'p',
      sticky: undefined,
      style: {
        color: '#16202a',
        fontSize: parseFontSizeValue('18px'),
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

export function createSectionFromTemplate(templateId: SectionTemplateId, parentId: NodeId): TemplateBuild {
  switch (templateId) {
    case 'blank':
      return createBlankSection(parentId);
    case 'post':
      return createPostSection(parentId);
    case 'stickyStaggeredImages':
      return createStickyStaggeredImagesSection(parentId);
    case 'stickyPinnedCards':
      return createStickyPinnedCardsSection(parentId);
    case 'stickyMediaReveal':
      return createStickyMediaRevealSection(parentId);
    case 'stickySteps':
      return createStickyStepsSection(parentId);
    default:
      return createBlankSection(parentId);
  }
}

export function createInitialDocument(): DocumentModel {
  const siteId = nextId('site');
  const { wrapper: header, nodes: headerNodes } = createDefaultHeader(siteId);
  const { wrapper: starterSection, nodes: starterSectionNodes } = createSectionFromTemplate('post', siteId);
  const { wrapper: footer, nodes: footerNodes } = createDefaultFooter(siteId);

  return {
    rootId: siteId,
    nodes: {
      [siteId]: {
        id: siteId,
        type: 'site',
        parentId: null,
        children: [header.id, starterSection.id, footer.id],
        name: 'Site',
        visible: true,
        locked: false,
      },
      ...headerNodes,
      ...starterSectionNodes,
      ...footerNodes,
    },
  };
}

function createBlankSection(parentId: NodeId): TemplateBuild {
  const section = createTemplateSection(parentId, 'Blank Section', '50vh', {
    top: '64px',
    right: '72px',
    bottom: '64px',
  });

  return buildTemplate(section);
}

function createPostSection(parentId: NodeId): TemplateBuild {
  const section = createTemplateSection(parentId, 'Post Layout', '50vh', {
    top: '64px',
    right: '72px',
    bottom: '72px',
  });

  const image = createImageNode(section.id, {
    name: 'Post Image',
    x: '52px',
    y: '88px',
    width: '420px',
    height: 'aspect-ratio(4/3)',
  });

  const title = createTextNode(section.id, {
    name: 'Post Title',
    content: 'Plan sticky behavior before building scroll-driven animations',
    x: '544px',
    y: '118px',
    width: '520px',
    style: {
      color: '#0f172a',
      fontSize: '44px',
      fontWeight: 'bold',
      lineHeight: 1.1,
      htmlTag: 'h1',
    },
  });

  const body = createTextNode(section.id, {
    name: 'Post Body',
    content:
      'Use reusable section templates to validate offset, duration, and sticky overlap behavior before wiring production code.',
    x: '548px',
    y: '282px',
    width: '480px',
    style: {
      color: '#475569',
      fontSize: '23px',
      lineHeight: 1.28,
    },
  });

  const link = createLinkNode(section.id, {
    name: 'Post Link',
    label: 'Open playground spec',
    x: '548px',
    y: '418px',
    width: 'fit-content',
  });

  return buildTemplate(section, [image, title, body, link]);
}

function createStickyStaggeredImagesSection(parentId: NodeId): TemplateBuild {
  const section = createTemplateSection(parentId, 'Sticky Staggered Images', '1820px', {
    top: '84px',
    right: '72px',
    bottom: '84px',
  });

  const heading = createTextNode(section.id, {
    name: 'Section Heading',
    content: 'Staggered sticky gallery',
    x: '64px',
    y: '22.5px',
    width: '678px',
    height: '194px',
    style: { color: '#0f172a', fontSize: '52px', fontWeight: 'bold', lineHeight: 1.06, htmlTag: 'h2' },
  });

  const copy = createTextNode(section.id, {
    name: 'Section Copy',
    content: 'Each card pins with a unique offset and duration to test overlap behavior.',
    x: '68px',
    y: '92px',
    width: '540px',
    style: { color: '#475569', fontSize: '22px', lineHeight: 1.26 },
  });

  const imageA = createImageNode(section.id, {
    name: 'Sticky Image A',
    x: '64px',
    y: '256.96875px',
    width: '250px',
    height: 'aspect-ratio(4/3)',
    src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    alt: 'Golden desert dunes under soft sunlight',
    sticky: createCustomSticky('150vh', '15vh'),
  });

  const imageB = createImageNode(section.id, {
    name: 'Sticky Image B',
    x: '340px',
    y: '444.46875px',
    width: '260px',
    height: 'aspect-ratio(4/3)',
    src: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80',
    alt: 'Mist rising over a calm mountain lake',
    sticky: createCustomSticky('150vh', '15vh'),
  });

  const imageC = createImageNode(section.id, {
    name: 'Sticky Image C',
    x: '638px',
    y: '653.25px',
    width: '270px',
    height: 'aspect-ratio(4/3)',
    src: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    alt: 'Modern interior with natural light and textured seating',
    sticky: createCustomSticky('150vh', '15vh'),
  });

  const imageD = createImageNode(section.id, {
    name: 'Sticky Image D',
    x: '949px',
    y: '898.84375px',
    width: '220px',
    height: 'aspect-ratio(4/3)',
    src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    alt: 'Golden desert dunes under soft sunlight',
    sticky: createCustomSticky('150vh', '15vh'),
  });

  return buildTemplate(section, [heading, copy, imageA, imageB, imageC, imageD]);
}

function createStickyPinnedCardsSection(parentId: NodeId): TemplateBuild {
  const section = createTemplateSection(parentId, 'Sticky Pinned Cards', '1760px', {
    top: '80px',
    right: '72px',
    bottom: '96px',
  });

  const lead = createTextNode(section.id, {
    name: 'Pinned Lead',
    content: 'One pinned message, many scrolling details',
    x: '85px',
    y: '212.28125px',
    width: '360px',
    height: '234px',
    style: { color: '#0f172a', fontSize: '46px', fontWeight: 'bold', lineHeight: 1.06, htmlTag: 'h2' },
  });
  lead.sticky = {
    enabled: true,
    target: 'self',
    edges: { top: true, bottom: false },
    durationMode: 'auto',
    duration: parseUnitValue('220vh'),
    durationTop: parseUnitValue('220vh'),
    durationBottom: parseUnitValue('220vh'),
    offsetTop: parseUnitValue('12vh'),
  };

  const leadBody = createTextNode(section.id, {
    name: 'Pinned Lead Copy',
    content: 'Use this to validate long sticky durations while content cards keep moving.',
    x: '83px',
    y: '373px',
    width: '340px',
    style: { color: '#475569', fontSize: '18px', lineHeight: 1.3 },
  });

  const card1 = createTextNode(section.id, {
    name: 'Narrative Card 1',
    content: 'Card 1\nTune offsets and verify the spacer end-line for the pinned lead.',
    x: '520px',
    y: '235.71875px',
    width: '520px',
    style: { color: '#0f172a', fontSize: '26px', lineHeight: 1.2 },
  });
  card1.sticky = createCustomSticky('25vh', '15vh');

  const card2 = createTextNode(section.id, {
    name: 'Narrative Card 2',
    content: 'Card 2\nCheck snapping around sticky tracks while moving this block.',
    x: '520px',
    y: '700px',
    width: '520px',
    style: { color: '#0f172a', fontSize: '26px', lineHeight: 1.2 },
  });
  card2.sticky = createCustomSticky('25vh', '15vh');

  const card3 = createTextNode(section.id, {
    name: 'Narrative Card 3',
    content: 'Card 3\nUse this section to regression-test reorder, resize, and undo behavior.',
    x: '520px',
    y: '1211.84375px',
    width: '520px',
    height: '201px',
    style: { color: '#0f172a', fontSize: '26px', lineHeight: 1.2 },
  });
  card3.sticky = createCustomSticky('50vh', '15vh');

  return buildTemplate(section, [lead, leadBody, card1, card2, card3]);
}

function createStickyMediaRevealSection(parentId: NodeId): TemplateBuild {
  const section = createTemplateSection(parentId, 'Sticky Media Reveal', '1840px', {
    top: '78px',
    right: '72px',
    bottom: '96px',
  });

  const heading = createTextNode(section.id, {
    name: 'Section Heading',
    content: 'Pinned media with scrolling narrative',
    x: '558px',
    y: '165px',
    width: '520px',
    style: { color: '#0f172a', fontSize: '44px', fontWeight: 'bold', lineHeight: 1.1, htmlTag: 'h2' },
  });

  const mediaImage = createImageNode(section.id, {
    name: 'Pinned Media',
    x: '77px',
    y: '165px',
    width: '401px',
    height: '428px',
    src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    alt: 'Golden desert dunes under soft sunlight',
  });
  mediaImage.sticky = {
    enabled: true,
    target: 'self',
    edges: { top: true, bottom: false },
    durationMode: 'custom',
    duration: parseUnitValue('150vh'),
    durationTop: parseUnitValue('150vh'),
    offsetTop: parseUnitValue('10vh'),
  };

  const revealBackdrop = createImageNode(section.id, {
    name: 'Reveal Backdrop',
    x: '78px',
    y: '167px',
    width: '399px',
    height: '426px',
    src: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    alt: 'Modern interior with natural light and textured seating',
  });
  revealBackdrop.sticky = {
    enabled: true,
    target: 'self',
    edges: { top: true, bottom: false },
    durationMode: 'custom',
    duration: parseUnitValue('25vh'),
    durationTop: parseUnitValue('25vh'),
    offsetTop: parseUnitValue('10vh'),
  };

  const blockA = createTextNode(section.id, {
    name: 'Narrative Block A',
    content: 'A. We start with an image and stay with it \nfor a while',
    x: '560px',
    y: '313.640625px',
    width: '530px',
    style: { color: '#0f172a', fontSize: '24px', lineHeight: 1.22 },
  });

  const blockB = createTextNode(section.id, {
    name: 'Narrative Block B',
    content: 'B. We reveal a second image, starting to tell a story',
    x: '560px',
    y: '1035px',
    width: '530px',
    style: { color: '#0f172a', fontSize: '24px', lineHeight: 1.22 },
  });

  const blockC = createTextNode(section.id, {
    name: 'Narrative Block C',
    content:
      'C. We end with some text we wanted to say about this image. Maybe a description, maybe an epilogue.\n',
    x: '559px',
    y: '1687px',
    width: '530px',
    height: '306px',
    style: { color: '#0f172a', fontSize: '24px', lineHeight: 1.22 },
  });

  return buildTemplate(section, [heading, mediaImage, blockA, blockB, blockC, revealBackdrop]);
}

function createStickyStepsSection(parentId: NodeId): TemplateBuild {
  const section = createTemplateSection(parentId, 'Sticky Edge Lab', '2480px', {
    top: '80px',
    right: '72px',
    bottom: '120px',
  });

  const nodes: Record<NodeId, DocumentNode> = {
    [section.id]: section,
  };

  const createSectionText = (name: string, rect: RectConfig, content: string, textStyle: TextStyleOptions) => {
    const text = createTextNode(section.id, {
      name,
      content,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      style: textStyle,
    });
    nodes[text.id] = text;
    return text;
  };

  const createStickyCardContainer = (
    options: {
      containerName: string;
      textName: string;
      x: string;
      y: string;
      width: string;
      height: string;
      content: string;
      textX: string;
      textY: string;
      textWidth: string;
      textHeight: string;
      background: string;
      sticky: StickyDefinition;
    },
  ) => {
    const container = createWrapper('container', section.id);
    container.name = options.containerName;
    container.rect = createDefaultRect(options.x, options.y, options.width, options.height);
    container.style.background = options.background;
    container.style.borderColor = '#d6e2f2';
    container.style.borderWidth = parseUnitValue('1px');
    container.style.paddingTop = parseUnitValue('0px');
    container.style.paddingRight = parseUnitValue('0px');
    container.style.paddingBottom = parseUnitValue('0px');
    container.style.paddingLeft = parseUnitValue('0px');
    container.sticky = options.sticky;

    const text = createTextNode(container.id, {
      name: options.textName,
      content: options.content,
      x: options.textX,
      y: options.textY,
      width: options.textWidth,
      height: options.textHeight,
      style: { color: '#0f172a', fontSize: '24px', fontWeight: 'bold', lineHeight: 1.18 },
    });

    setChildren(container, [text]);
    nodes[container.id] = container;
    nodes[text.id] = text;
    return container;
  };

  const heading = createSectionText(
    'Section Heading',
    { x: '72px', y: '86px', width: '980px' },
    'Sticky edge lab: top, both, bottom',
    { color: '#0f172a', fontSize: '48px', fontWeight: 'bold', lineHeight: 1.04, htmlTag: 'h2' },
  );

  const intro = createSectionText(
    'Section Intro',
    { x: '74px', y: '170px', width: '980px' },
    'Use one section to compare sticky behavior for top, both, and bottom edges with the same viewport and drag context.',
    { color: '#475569', fontSize: '22px', lineHeight: 1.24 },
  );

  const topNotes = createSectionText(
    'Top Column Notes',
    { x: '78px', y: '972px', width: '330px' },
    'Top notes\nUse this column to verify top-edge pinning, offset marker placement, and drag snapping around a single top constraint.',
    { color: '#0f172a', fontSize: '22px', lineHeight: 1.22 },
  );

  const bothNotes = createSectionText(
    'Both Column Notes',
    { x: '473px', y: '1293px', width: '330px' },
    'Both notes\nAdjust dual offsets and split durations to validate the combined top+bottom constraint and dual guide rendering.',
    { color: '#0f172a', fontSize: '22px', lineHeight: 1.22 },
  );

  const bottomNotes = createSectionText(
    'Bottom Column Notes',
    { x: '870px', y: '1780px', width: '330px' },
    'Bottom notes\nCheck bottom-edge pinning, spacer direction, and that repeated drags do not introduce hidden Y feedback loops.',
    { color: '#0f172a', fontSize: '22px', lineHeight: 1.22 },
  );

  const footerNote = createSectionText(
    'Section Footer Note',
    { x: '96px', y: '2604.984375px', width: '1120px', height: '44px' },
    'Tip: select each card and switch edge/offset/duration values in the inspector to compare how spacer and offset visuals respond.',
    { color: '#475569', fontSize: '18px', lineHeight: 1.26 },
  );

  const topCardContainer = createStickyCardContainer({
    containerName: 'Top Edge Card Container',
    textName: 'Top Edge Card',
    x: '72px',
    y: '362px',
    width: '330px',
    height: '151px',
    content: 'Top card\nEdges: top\nOffset: 10vh\nDistance: 140vh',
    textX: '18px',
    textY: '15.390625px',
    textWidth: '264px',
    textHeight: '120px',
    background: '#eaf3ff',
    sticky: createCustomSticky('140vh', '10vh'),
  });

  const bothCardContainer = createStickyCardContainer({
    containerName: 'Both Edges Card Container',
    textName: 'Both Edges Card',
    x: '473px',
    y: '761px',
    width: '330px',
    height: '201px',
    content:
      'Both card\nEdges: both\nTop Offset: 10vh\nBottom Offset: 10vh\nTop Distance: 80vh\nBottom Distance: 80vh',
    textX: '20px',
    textY: '10.875px',
    textWidth: '288px',
    textHeight: '179px',
    background: '#eefae9',
    sticky: {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: true },
      durationMode: 'custom',
      duration: parseUnitValue('160vh'),
      durationTop: parseUnitValue('80vh'),
      durationBottom: parseUnitValue('80vh'),
      offsetTop: parseUnitValue('10vh'),
      offsetBottom: parseUnitValue('10vh'),
    },
  });

  const bottomCardContainer = createStickyCardContainer({
    containerName: 'Bottom Edge Card Container',
    textName: 'Bottom Edge Card',
    x: '864px',
    y: '1179.9921875px',
    width: '330px',
    height: '146px',
    content: 'Bottom card\nEdges: bottom\nOffset: 10vh\nDistance: 140vh',
    textX: '22px',
    textY: '12.8984375px',
    textWidth: '273px',
    textHeight: '120px',
    background: '#fff4ea',
    sticky: {
      enabled: true,
      target: 'self',
      edges: { top: false, bottom: true },
      durationMode: 'custom',
      duration: parseUnitValue('140vh'),
      durationTop: parseUnitValue('140vh'),
      durationBottom: parseUnitValue('140vh'),
      offsetBottom: parseUnitValue('10vh'),
    },
  });

  // Keep sticky containers at the end of DOM order so they render above static notes when overlapping.
  setChildren(section, [
    bothNotes,
    heading,
    intro,
    topNotes,
    bottomNotes,
    topCardContainer,
    bothCardContainer,
    bottomCardContainer,
    footerNote,
  ]);

  return {
    wrapper: section,
    nodes,
  };
}

function styleText(
  leaf: TextLeaf,
  options: {
    color?: string;
    fontSize?: string;
    fontWeight?: 'normal' | 'bold';
    lineHeight?: number;
    htmlTag?: TextLeaf['htmlTag'];
  },
) {
  leaf.style ??= {};
  if (options.color) {
    leaf.style.color = options.color;
  }
  if (options.fontSize) {
    leaf.style.fontSize = parseFontSizeValue(options.fontSize);
  }
  if (options.fontWeight) {
    leaf.style.fontWeight = options.fontWeight;
  }
  if (typeof options.lineHeight === 'number') {
    leaf.style.lineHeight = options.lineHeight;
  }
  if (options.htmlTag) {
    leaf.htmlTag = options.htmlTag;
  }
}

function createCustomSticky(duration: string, offsetTop: string): StickyDefinition {
  return {
    enabled: true,
    target: 'self',
    edges: { top: true, bottom: false },
    durationMode: 'custom',
    duration: parseUnitValue(duration),
    durationTop: parseUnitValue(duration),
    durationBottom: parseUnitValue(duration),
    offsetTop: parseUnitValue(offsetTop),
  };
}
