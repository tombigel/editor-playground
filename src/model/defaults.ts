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

type TemplateBuild = {
  wrapper: WrapperNode;
  nodes: Record<NodeId, DocumentNode>;
};

export type SectionTemplateId =
  | 'blank'
  | 'post'
  | 'stickyStaggeredImages'
  | 'stickyPinnedCards'
  | 'stickyMediaReveal'
  | 'stickySteps';

export type SectionTemplateSummary = {
  id: SectionTemplateId;
  name: string;
  description: string;
  category: 'basic' | 'sticky';
};

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
    description: 'Pinned media column with right-side reveal content.',
    category: 'sticky',
  },
  {
    id: 'stickySteps',
    name: 'Sticky Bottom Dock',
    description: 'Bottom-pinned summary card with scrolling narrative stream.',
    category: 'sticky',
  },
];

export function createDefaultHeader(parentId: NodeId) {
  const header = createWrapper('header', parentId);
  header.name = 'Playground Header';
  header.rect = createDefaultRect('0px', '0px', '100%', 'auto');
  header.style.background = '#f8fbff';
  header.style.borderColor = '#d6e2f2';
  header.style.paddingTop = parseUnitValue('20px');
  header.style.paddingRight = parseUnitValue('48px');
  header.style.paddingBottom = parseUnitValue('20px');
  header.style.paddingLeft = parseUnitValue('48px');

  const headerLogo = createLeaf('text', header.id) as TextLeaf;
  headerLogo.name = 'Product Title';
  headerLogo.content = 'Sticky Playground';
  headerLogo.rect = createDefaultRect('62px', '25.5px', 'fit-content', 'auto');
  headerLogo.style ??= {};
  headerLogo.style.color = '#0f172a';
  headerLogo.style.fontSize = parseUnitValue('20px');
  headerLogo.style.fontWeight = 'bold';

  const headerSubtitle = createLeaf('text', header.id) as TextLeaf;
  headerSubtitle.name = 'Product Subtitle';
  headerSubtitle.content = 'Model, preview, and validate sticky behavior before implementation.';
  headerSubtitle.rect = createDefaultRect('61px', '60px', 'fit-content', 'auto');
  headerSubtitle.style ??= {};
  headerSubtitle.style.color = '#516174';
  headerSubtitle.style.fontSize = parseUnitValue('14px');

  const navTemplates = createLeaf('link', header.id) as LinkLeaf;
  navTemplates.name = 'Templates Link';
  navTemplates.label = 'Templates';
  navTemplates.rect = createDefaultRect('836px', '48px', 'fit-content', 'auto');

  const navSticky = createLeaf('link', header.id) as LinkLeaf;
  navSticky.name = 'Sticky Demos Link';
  navSticky.label = 'Sticky Demos';
  navSticky.rect = createDefaultRect('947px', '48px', 'fit-content', 'auto');

  const navTests = createLeaf('link', header.id) as LinkLeaf;
  navTests.name = 'Test Plan Link';
  navTests.label = 'Test Plan';
  navTests.rect = createDefaultRect('1082px', '48px', '144px', '24px');

  header.children = [headerLogo.id, headerSubtitle.id, navTemplates.id, navSticky.id, navTests.id];

  return {
    wrapper: header,
    nodes: {
      [header.id]: header,
      [headerLogo.id]: headerLogo,
      [headerSubtitle.id]: headerSubtitle,
      [navTemplates.id]: navTemplates,
      [navSticky.id]: navSticky,
      [navTests.id]: navTests,
    },
  };
}

export function createDefaultFooter(parentId: NodeId) {
  const footer = createWrapper('footer', parentId);
  footer.name = 'Playground Footer';
  footer.rect = createDefaultRect('0px', '0px', '100%', 'auto');
  footer.style.background = '#f8fbff';
  footer.style.borderColor = '#d6e2f2';
  footer.style.paddingTop = parseUnitValue('26px');
  footer.style.paddingRight = parseUnitValue('48px');
  footer.style.paddingBottom = parseUnitValue('26px');
  footer.style.paddingLeft = parseUnitValue('48px');

  const footerTitle = createLeaf('text', footer.id) as TextLeaf;
  footerTitle.name = 'Footer Title';
  footerTitle.content = 'Sticky Playground';
  footerTitle.rect = createDefaultRect('67px', '28px', 'fit-content', 'auto');
  footerTitle.style ??= {};
  footerTitle.style.color = '#0f172a';
  footerTitle.style.fontSize = parseUnitValue('16px');
  footerTitle.style.fontWeight = 'bold';
  footerTitle.style.lineHeight = 1.2;

  const footerCopy = createLeaf('text', footer.id) as TextLeaf;
  footerCopy.name = 'Footer Copy';
  footerCopy.content =
    'A prototyping surface for sticky logic, spacing strategy, and interaction QA.';
  footerCopy.rect = createDefaultRect('64px', '53px', '271px', '38px');
  footerCopy.style ??= {};
  footerCopy.style.color = '#475569';
  footerCopy.style.fontSize = parseUnitValue('14px');
  footerCopy.style.lineHeight = 1.3;

  const footerLink = createLeaf('link', footer.id) as LinkLeaf;
  footerLink.name = 'Repository Link';
  footerLink.label = 'github.com/tombigel/codex-playground';
  footerLink.href = 'https://github.com/tombigel/codex-playground';
  footerLink.rect = createDefaultRect('866px', '48px', '322px', '24px');

  footer.children = [footerTitle.id, footerCopy.id, footerLink.id];

  return {
    wrapper: footer,
    nodes: {
      [footer.id]: footer,
      [footerTitle.id]: footerTitle,
      [footerCopy.id]: footerCopy,
      [footerLink.id]: footerLink,
    },
  };
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
  const section = createWrapper('section', parentId);
  section.name = 'Blank Section';
  section.rect = createDefaultRect('0px', '0px', '100%', '640px');
  section.style.paddingTop = parseUnitValue('64px');
  section.style.paddingRight = parseUnitValue('72px');
  section.style.paddingBottom = parseUnitValue('64px');
  section.style.paddingLeft = parseUnitValue('72px');

  return {
    wrapper: section,
    nodes: {
      [section.id]: section,
    },
  };
}

function createPostSection(parentId: NodeId): TemplateBuild {
  const section = createWrapper('section', parentId);
  section.name = 'Post Layout';
  section.rect = createDefaultRect('0px', '0px', '100%', '760px');
  section.style.paddingTop = parseUnitValue('64px');
  section.style.paddingRight = parseUnitValue('72px');
  section.style.paddingBottom = parseUnitValue('72px');
  section.style.paddingLeft = parseUnitValue('72px');

  const image = createLeaf('image', section.id) as ImageLeaf;
  image.name = 'Post Image';
  image.rect = createDefaultRect('52px', '88px', '420px', 'aspect-ratio(4/3)');

  const title = createLeaf('text', section.id) as TextLeaf;
  title.name = 'Post Title';
  title.content = 'Plan sticky behavior before building scroll-driven animations';
  title.rect = createDefaultRect('544px', '118px', '520px', 'auto');
  styleText(title, {
    color: '#0f172a',
    fontSize: '44px',
    fontWeight: 'bold',
    lineHeight: 1.1,
  });

  const body = createLeaf('text', section.id) as TextLeaf;
  body.name = 'Post Body';
  body.content =
    'Use reusable section templates to validate offset, duration, and sticky overlap behavior before wiring production code.';
  body.rect = createDefaultRect('548px', '282px', '480px', 'auto');
  styleText(body, {
    color: '#475569',
    fontSize: '23px',
    lineHeight: 1.28,
  });

  const link = createLeaf('link', section.id) as LinkLeaf;
  link.name = 'Post Link';
  link.label = 'Open maintenance test plan';
  link.rect = createDefaultRect('548px', '418px', 'fit-content', 'auto');

  section.children = [image.id, title.id, body.id, link.id];

  return {
    wrapper: section,
    nodes: {
      [section.id]: section,
      [image.id]: image,
      [title.id]: title,
      [body.id]: body,
      [link.id]: link,
    },
  };
}

function createStickyStaggeredImagesSection(parentId: NodeId): TemplateBuild {
  const section = createWrapper('section', parentId);
  section.name = 'Sticky Staggered Images';
  section.rect = createDefaultRect('0px', '0px', '100%', '1820px');
  section.style.paddingTop = parseUnitValue('84px');
  section.style.paddingRight = parseUnitValue('72px');
  section.style.paddingBottom = parseUnitValue('84px');
  section.style.paddingLeft = parseUnitValue('72px');

  const heading = createLeaf('text', section.id) as TextLeaf;
  heading.name = 'Section Heading';
  heading.content = 'Staggered sticky gallery';
  heading.rect = createDefaultRect('64px', '22.5px', '678px', '194px');
  styleText(heading, { color: '#0f172a', fontSize: '52px', fontWeight: 'bold', lineHeight: 1.06 });

  const copy = createLeaf('text', section.id) as TextLeaf;
  copy.name = 'Section Copy';
  copy.content = 'Each card pins with a unique offset and duration to test overlap behavior.';
  copy.rect = createDefaultRect('68px', '92px', '540px', 'auto');
  styleText(copy, { color: '#475569', fontSize: '22px', lineHeight: 1.26 });

  const imageA = createLeaf('image', section.id) as ImageLeaf;
  imageA.name = 'Sticky Image A';
  imageA.rect = createDefaultRect('64px', '256.96875px', '250px', 'aspect-ratio(4/3)');
  imageA.src = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80';
  imageA.alt = 'Golden desert dunes under soft sunlight';
  imageA.sticky = createCustomSticky('150vh', '15vh');

  const imageB = createLeaf('image', section.id) as ImageLeaf;
  imageB.name = 'Sticky Image B';
  imageB.rect = createDefaultRect('340px', '444.46875px', '260px', 'aspect-ratio(4/3)');
  imageB.src = 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80';
  imageB.alt = 'Mist rising over a calm mountain lake';
  imageB.sticky = createCustomSticky('150vh', '15vh');

  const imageC = createLeaf('image', section.id) as ImageLeaf;
  imageC.name = 'Sticky Image C';
  imageC.rect = createDefaultRect('638px', '653.25px', '270px', 'aspect-ratio(4/3)');
  imageC.src = 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80';
  imageC.alt = 'Modern interior with natural light and textured seating';
  imageC.sticky = createCustomSticky('150vh', '15vh');

  const imageD = createLeaf('image', section.id) as ImageLeaf;
  imageD.name = 'Sticky Image D';
  imageD.rect = createDefaultRect('949px', '898.84375px', '220px', 'aspect-ratio(4/3)');
  imageD.src = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80';
  imageD.alt = 'Golden desert dunes under soft sunlight';
  imageD.sticky = createCustomSticky('150vh', '15vh');

  section.children = [heading.id, copy.id, imageA.id, imageB.id, imageC.id, imageD.id];

  return {
    wrapper: section,
    nodes: {
      [section.id]: section,
      [heading.id]: heading,
      [copy.id]: copy,
      [imageA.id]: imageA,
      [imageB.id]: imageB,
      [imageC.id]: imageC,
      [imageD.id]: imageD,
    },
  };
}

function createStickyPinnedCardsSection(parentId: NodeId): TemplateBuild {
  const section = createWrapper('section', parentId);
  section.name = 'Sticky Pinned Cards';
  section.rect = createDefaultRect('0px', '0px', '100%', '1760px');
  section.style.paddingTop = parseUnitValue('80px');
  section.style.paddingRight = parseUnitValue('72px');
  section.style.paddingBottom = parseUnitValue('96px');
  section.style.paddingLeft = parseUnitValue('72px');

  const lead = createLeaf('text', section.id) as TextLeaf;
  lead.name = 'Pinned Lead';
  lead.content = 'One pinned message, many scrolling details';
  lead.rect = createDefaultRect('85px', '212.28125px', '360px', '234px');
  styleText(lead, { color: '#0f172a', fontSize: '46px', fontWeight: 'bold', lineHeight: 1.06 });
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

  const leadBody = createLeaf('text', section.id) as TextLeaf;
  leadBody.name = 'Pinned Lead Copy';
  leadBody.content = 'Use this to validate long sticky durations while content cards keep moving.';
  leadBody.rect = createDefaultRect('83px', '373px', '340px', 'auto');
  styleText(leadBody, { color: '#475569', fontSize: '18px', lineHeight: 1.3 });

  const card1 = createLeaf('text', section.id) as TextLeaf;
  card1.name = 'Narrative Card 1';
  card1.content = 'Card 1\nTune offsets and verify the spacer end-line for the pinned lead.';
  card1.rect = createDefaultRect('520px', '235.71875px', '520px', 'auto');
  card1.sticky = createCustomSticky('25vh', '15vh');
  styleText(card1, { color: '#0f172a', fontSize: '26px', lineHeight: 1.2 });

  const card2 = createLeaf('text', section.id) as TextLeaf;
  card2.name = 'Narrative Card 2';
  card2.content = 'Card 2\nCheck snapping around sticky tracks while moving this block.';
  card2.rect = createDefaultRect('520px', '700px', '520px', 'auto');
  card2.sticky = createCustomSticky('25vh', '15vh');
  styleText(card2, { color: '#0f172a', fontSize: '26px', lineHeight: 1.2 });

  const card3 = createLeaf('text', section.id) as TextLeaf;
  card3.name = 'Narrative Card 3';
  card3.content = 'Card 3\nUse this section to regression-test reorder, resize, and undo behavior.';
  card3.rect = createDefaultRect('520px', '1211.84375px', '520px', '201px');
  card3.sticky = createCustomSticky('50vh', '15vh');
  styleText(card3, { color: '#0f172a', fontSize: '26px', lineHeight: 1.2 });

  section.children = [lead.id, leadBody.id, card1.id, card2.id, card3.id];

  return {
    wrapper: section,
    nodes: {
      [section.id]: section,
      [lead.id]: lead,
      [leadBody.id]: leadBody,
      [card1.id]: card1,
      [card2.id]: card2,
      [card3.id]: card3,
    },
  };
}

function createStickyMediaRevealSection(parentId: NodeId): TemplateBuild {
  const section = createWrapper('section', parentId);
  section.name = 'Sticky Media Reveal';
  section.rect = createDefaultRect('0px', '0px', '100%', '1840px');
  section.style.paddingTop = parseUnitValue('78px');
  section.style.paddingRight = parseUnitValue('72px');
  section.style.paddingBottom = parseUnitValue('96px');
  section.style.paddingLeft = parseUnitValue('72px');

  const heading = createLeaf('text', section.id) as TextLeaf;
  heading.name = 'Section Heading';
  heading.content = 'Pinned media with scrolling narrative';
  heading.rect = createDefaultRect('558px', '165px', '520px', 'auto');
  styleText(heading, { color: '#0f172a', fontSize: '44px', fontWeight: 'bold', lineHeight: 1.1 });

  const mediaImage = createLeaf('image', section.id) as ImageLeaf;
  mediaImage.name = 'Pinned Media';
  mediaImage.rect = createDefaultRect('77px', '165px', '401px', '428px');
  mediaImage.src = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80';
  mediaImage.alt = 'Golden desert dunes under soft sunlight';
  mediaImage.sticky = createCustomSticky('100vh', '10vh');

  const blockA = createLeaf('text', section.id) as TextLeaf;
  blockA.name = 'Narrative Block A';
  blockA.content = 'A. Define the sticky owner and inspect the offset marker alignment.';
  blockA.rect = createDefaultRect('560px', '310px', '530px', 'auto');
  styleText(blockA, { color: '#0f172a', fontSize: '24px', lineHeight: 1.22 });

  const blockB = createLeaf('text', section.id) as TextLeaf;
  blockB.name = 'Narrative Block B';
  blockB.content = 'B. Validate spacer height and ensure section extent matches furthest sticky end.';
  blockB.rect = createDefaultRect('560px', '760px', '530px', 'auto');
  styleText(blockB, { color: '#0f172a', fontSize: '24px', lineHeight: 1.22 });

  const blockC = createLeaf('text', section.id) as TextLeaf;
  blockC.name = 'Narrative Block C';
  blockC.content = 'C. Confirm dragging and snapping stay consistent while sticky preview is enabled.';
  blockC.rect = createDefaultRect('560px', '1210px', '530px', 'auto');
  styleText(blockC, { color: '#0f172a', fontSize: '24px', lineHeight: 1.22 });

  section.children = [heading.id, mediaImage.id, blockA.id, blockB.id, blockC.id];

  return {
    wrapper: section,
    nodes: {
      [section.id]: section,
      [heading.id]: heading,
      [mediaImage.id]: mediaImage,
      [blockA.id]: blockA,
      [blockB.id]: blockB,
      [blockC.id]: blockC,
    },
  };
}

function createStickyStepsSection(parentId: NodeId): TemplateBuild {
  const section = createWrapper('section', parentId);
  section.name = 'Sticky Bottom Dock';
  section.rect = createDefaultRect('0px', '0px', '100%', '2100px');
  section.style.paddingTop = parseUnitValue('76px');
  section.style.paddingRight = parseUnitValue('72px');
  section.style.paddingBottom = parseUnitValue('104px');
  section.style.paddingLeft = parseUnitValue('72px');

  const heading = createLeaf('text', section.id) as TextLeaf;
  heading.name = 'Section Heading';
  heading.content = 'Sticky bottom dock';
  heading.rect = createDefaultRect('76px', '92px', '560px', 'auto');
  styleText(heading, { color: '#0f172a', fontSize: '50px', fontWeight: 'bold', lineHeight: 1.04 });

  const introCopy = createLeaf('text', section.id) as TextLeaf;
  introCopy.name = 'Section Intro';
  introCopy.content = 'Test bottom-edge sticky behavior while detail cards keep scrolling upward.';
  introCopy.rect = createDefaultRect('78px', '182px', '560px', 'auto');
  styleText(introCopy, { color: '#475569', fontSize: '22px', lineHeight: 1.24 });

  const dockCard = createLeaf('text', section.id) as TextLeaf;
  dockCard.name = 'Bottom Dock Card';
  dockCard.content =
    'Pinned summary card\nEdges: bottom\nOffset: 8vh\nDuration: 180vh\n\nUse this card to verify bottom stick behavior and spacer alignment.';
  dockCard.rect = createDefaultRect('724px', '1320px', '420px', '272px');
  styleText(dockCard, { color: '#0f172a', fontSize: '24px', fontWeight: 'bold', lineHeight: 1.18 });
  dockCard.sticky = {
    enabled: true,
    target: 'self',
    edges: { top: false, bottom: true },
    durationMode: 'custom',
    duration: parseUnitValue('180vh'),
    durationTop: parseUnitValue('180vh'),
    durationBottom: parseUnitValue('180vh'),
    offsetBottom: parseUnitValue('8vh'),
  };

  const detailA = createLeaf('text', section.id) as TextLeaf;
  detailA.name = 'Detail Card A';
  detailA.content = 'A\nSwitch between top and bottom edges and validate track labels.';
  detailA.rect = createDefaultRect('84px', '420px', '520px', 'auto');
  styleText(detailA, { color: '#0f172a', fontSize: '26px', lineHeight: 1.2 });

  const detailB = createLeaf('text', section.id) as TextLeaf;
  detailB.name = 'Detail Card B';
  detailB.content = 'B\nDrag this block near guides and inspect bottom snap behavior.';
  detailB.rect = createDefaultRect('104px', '860px', '520px', 'auto');
  styleText(detailB, { color: '#0f172a', fontSize: '26px', lineHeight: 1.2 });

  const detailC = createLeaf('text', section.id) as TextLeaf;
  detailC.name = 'Detail Card C';
  detailC.content = 'C\nResize the dock and confirm sticky preview does not drift model coordinates.';
  detailC.rect = createDefaultRect('122px', '1320px', '520px', 'auto');
  styleText(detailC, { color: '#0f172a', fontSize: '26px', lineHeight: 1.2 });

  const detailD = createLeaf('text', section.id) as TextLeaf;
  detailD.name = 'Detail Card D';
  detailD.content = 'D\nRun undo/redo after bottom-sticky edits to validate transaction boundaries.';
  detailD.rect = createDefaultRect('144px', '1740px', '520px', 'auto');
  styleText(detailD, { color: '#0f172a', fontSize: '26px', lineHeight: 1.2 });

  section.children = [heading.id, introCopy.id, dockCard.id, detailA.id, detailB.id, detailC.id, detailD.id];

  return {
    wrapper: section,
    nodes: {
      [section.id]: section,
      [heading.id]: heading,
      [introCopy.id]: introCopy,
      [dockCard.id]: dockCard,
      [detailA.id]: detailA,
      [detailB.id]: detailB,
      [detailC.id]: detailC,
      [detailD.id]: detailD,
    },
  };
}

function styleText(
  leaf: TextLeaf,
  options: {
    color?: string;
    fontSize?: string;
    fontWeight?: 'normal' | 'bold';
    lineHeight?: number;
  },
) {
  leaf.style ??= {};
  if (options.color) {
    leaf.style.color = options.color;
  }
  if (options.fontSize) {
    leaf.style.fontSize = parseUnitValue(options.fontSize);
  }
  if (options.fontWeight) {
    leaf.style.fontWeight = options.fontWeight;
  }
  if (typeof options.lineHeight === 'number') {
    leaf.style.lineHeight = options.lineHeight;
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
