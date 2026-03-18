import type {
  DocumentNode,
  NodeId,
  RectConfig,
  SectionTemplateId,
  SectionTemplateSummary,
  StickyDefinition,
  TemplateBuild,
  TextStyleOptions,
} from './types';
import { createDefaultRect, createWrapper } from './defaultFactories';
import {
  addTemplateNodes,
  buildTemplate,
  createBothSticky,
  createBottomSticky,
  createImageNode,
  createLinkNode,
  createTemplateSection,
  createTextNode,
  createTopSticky,
  setChildren,
} from './templateHelpers';
import { parseSpacingValue, parseUnitValue } from './units';

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
      fontWeight: 700,
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
    style: { color: '#0f172a', fontSize: '52px', fontWeight: 700, lineHeight: 1.06, htmlTag: 'h2' },
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
    sticky: createTopSticky({ duration: '150vh', offsetTop: '15vh' }),
  });

  const imageB = createImageNode(section.id, {
    name: 'Sticky Image B',
    x: '340px',
    y: '444.46875px',
    width: '260px',
    height: 'aspect-ratio(4/3)',
    src: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80',
    alt: 'Mist rising over a calm mountain lake',
    sticky: createTopSticky({ duration: '150vh', offsetTop: '15vh' }),
  });

  const imageC = createImageNode(section.id, {
    name: 'Sticky Image C',
    x: '638px',
    y: '653.25px',
    width: '270px',
    height: 'aspect-ratio(4/3)',
    src: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    alt: 'Modern interior with natural light and textured seating',
    sticky: createTopSticky({ duration: '150vh', offsetTop: '15vh' }),
  });

  const imageD = createImageNode(section.id, {
    name: 'Sticky Image D',
    x: '949px',
    y: '898.84375px',
    width: '220px',
    height: 'aspect-ratio(4/3)',
    src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    alt: 'Golden desert dunes under soft sunlight',
    sticky: createTopSticky({ duration: '150vh', offsetTop: '15vh' }),
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
    style: { color: '#0f172a', fontSize: '46px', fontWeight: 700, lineHeight: 1.06, htmlTag: 'h2' },
  });
  lead.sticky = createTopSticky({
    duration: '220vh',
    offsetTop: '12vh',
    durationMode: 'auto',
  });

  const leadBody = createTextNode(section.id, {
    name: 'Pinned Lead Copy',
    content: 'Use this to validate long sticky durations while content cards keep moving.',
    x: '83px',
    y: '373px',
    width: '340px',
    style: { color: '#475569', fontSize: '18px', lineHeight: 1.3 },
  });

  const card1 = createNarrativeCard(section.id, 'Narrative Card 1', 'Card 1\nTune offsets and verify the spacer end-line for the pinned lead.', '520px', '235.71875px');
  card1.sticky = createTopSticky({ duration: '25vh', offsetTop: '15vh' });

  const card2 = createNarrativeCard(section.id, 'Narrative Card 2', 'Card 2\nCheck snapping around sticky tracks while moving this block.', '520px', '700px');
  card2.sticky = createTopSticky({ duration: '25vh', offsetTop: '15vh' });

  const card3 = createNarrativeCard(
    section.id,
    'Narrative Card 3',
    'Card 3\nUse this section to regression-test reorder, resize, and undo behavior.',
    '520px',
    '1211.84375px',
    '201px',
  );
  card3.sticky = createTopSticky({ duration: '50vh', offsetTop: '15vh' });

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
    style: { color: '#0f172a', fontSize: '44px', fontWeight: 700, lineHeight: 1.1, htmlTag: 'h2' },
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
  mediaImage.sticky = createTopSticky({ duration: '150vh', offsetTop: '10vh' });

  const revealBackdrop = createImageNode(section.id, {
    name: 'Reveal Backdrop',
    x: '78px',
    y: '167px',
    width: '399px',
    height: '426px',
    src: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    alt: 'Modern interior with natural light and textured seating',
  });
  revealBackdrop.sticky = createTopSticky({ duration: '25vh', offsetTop: '10vh' });

  const blockA = createNarrativeBlock(
    section.id,
    'Narrative Block A',
    'A. We start with an image and stay with it \nfor a while',
    '560px',
    '313.640625px',
  );
  const blockB = createNarrativeBlock(
    section.id,
    'Narrative Block B',
    'B. We reveal a second image, starting to tell a story',
    '560px',
    '1035px',
  );
  const blockC = createNarrativeBlock(
    section.id,
    'Narrative Block C',
    'C. We end with some text we wanted to say about this image. Maybe a description, maybe an epilogue.\n',
    '559px',
    '1687px',
    '306px',
  );

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

  const heading = createSectionText(
    section.id,
    'Section Heading',
    { x: '72px', y: '86px', width: '980px' },
    'Sticky edge lab: top, both, bottom',
    { color: '#0f172a', fontSize: '48px', fontWeight: 700, lineHeight: 1.04, htmlTag: 'h2' },
  );

  const intro = createSectionText(
    section.id,
    'Section Intro',
    { x: '74px', y: '170px', width: '980px' },
    'Use one section to compare sticky behavior for top, both, and bottom edges with the same viewport and drag context.',
    { color: '#475569', fontSize: '22px', lineHeight: 1.24 },
  );

  const topNotes = createSectionText(
    section.id,
    'Top Column Notes',
    { x: '78px', y: '972px', width: '330px' },
    'Top notes\nUse this column to verify top-edge pinning, offset marker placement, and drag snapping around a single top constraint.',
    { color: '#0f172a', fontSize: '22px', lineHeight: 1.22 },
  );

  const bothNotes = createSectionText(
    section.id,
    'Both Column Notes',
    { x: '473px', y: '1293px', width: '330px' },
    'Both notes\nAdjust dual offsets and split durations to validate the combined top+bottom constraint and dual guide rendering.',
    { color: '#0f172a', fontSize: '22px', lineHeight: 1.22 },
  );

  const bottomNotes = createSectionText(
    section.id,
    'Bottom Column Notes',
    { x: '870px', y: '1780px', width: '330px' },
    'Bottom notes\nCheck bottom-edge pinning, spacer direction, and that repeated drags do not introduce hidden Y feedback loops.',
    { color: '#0f172a', fontSize: '22px', lineHeight: 1.22 },
  );

  const footerNote = createSectionText(
    section.id,
    'Section Footer Note',
    { x: '96px', y: '2604.984375px', width: '1120px', height: '44px' },
    'Tip: select each card and switch edge/offset/duration values in the inspector to compare how spacer and offset visuals respond.',
    { color: '#475569', fontSize: '18px', lineHeight: 1.26 },
  );

  const topCardContainer = createStickyCardContainer(section.id, {
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
    sticky: createTopSticky({ duration: '140vh', offsetTop: '10vh' }),
  });

  const bothCardContainer = createStickyCardContainer(section.id, {
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
    sticky: createBothSticky({
      duration: '160vh',
      durationTop: '80vh',
      durationBottom: '80vh',
      offsetTop: '10vh',
      offsetBottom: '10vh',
    }),
  });

  const bottomCardContainer = createStickyCardContainer(section.id, {
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
    sticky: createBottomSticky({ durationBottom: '140vh', offsetBottom: '10vh' }),
  });

  addTemplateNodes(
    nodes,
    heading,
    intro,
    topNotes,
    bothNotes,
    bottomNotes,
    footerNote,
    topCardContainer.container,
    topCardContainer.text,
    bothCardContainer.container,
    bothCardContainer.text,
    bottomCardContainer.container,
    bottomCardContainer.text,
  );

  setChildren(section, [
    bothNotes,
    heading,
    intro,
    topNotes,
    bottomNotes,
    topCardContainer.container,
    bothCardContainer.container,
    bottomCardContainer.container,
    footerNote,
  ]);

  return {
    wrapper: section,
    nodes,
  };
}

function createNarrativeCard(parentId: NodeId, name: string, content: string, x: string, y: string, height = 'auto') {
  return createTextNode(parentId, {
    name,
    content,
    x,
    y,
    width: '520px',
    height,
    style: { color: '#0f172a', fontSize: '26px', lineHeight: 1.2 },
  });
}

function createNarrativeBlock(parentId: NodeId, name: string, content: string, x: string, y: string, height = 'auto') {
  return createTextNode(parentId, {
    name,
    content,
    x,
    y,
    width: '530px',
    height,
    style: { color: '#0f172a', fontSize: '24px', lineHeight: 1.22 },
  });
}

function createSectionText(
  parentId: NodeId,
  name: string,
  rect: RectConfig,
  content: string,
  textStyle: TextStyleOptions,
) {
  return createTextNode(parentId, {
    name,
    content,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    style: textStyle,
  });
}

function createStickyCardContainer(
  parentId: NodeId,
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
) {
  const container = createWrapper('container', parentId);
  container.name = options.containerName;
  container.rect = createDefaultRect(options.x, options.y, options.width, options.height);
  container.style.background = options.background;
  container.style.borderColor = '#d6e2f2';
  container.style.borderWidth = parseUnitValue('1px');
  container.style.paddingTop = parseSpacingValue('0px');
  container.style.paddingRight = parseSpacingValue('0px');
  container.style.paddingBottom = parseSpacingValue('0px');
  container.style.paddingLeft = parseSpacingValue('0px');
  container.sticky = options.sticky;

  const text = createTextNode(container.id, {
    name: options.textName,
    content: options.content,
    x: options.textX,
    y: options.textY,
    width: options.textWidth,
    height: options.textHeight,
    style: { color: '#0f172a', fontSize: '24px', fontWeight: 700, lineHeight: 1.18 },
  });

  setChildren(container, [text]);

  return { container, text };
}
