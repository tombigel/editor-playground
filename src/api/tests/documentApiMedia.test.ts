import { describe, expect, it } from 'vitest';
import { createMediaNode } from '../../model/defaults';
import { parseHeightValue } from '../../model/units';
import { adoptVideoIntrinsicRatioDoc, createInitialDocument } from '../documentApi';
import { setTextNodeContentDoc } from '../documentApi/text';
import type { MediaNode } from '../../model/types';

function firstSection(document: ReturnType<typeof createInitialDocument>) {
  const section = Object.values(document.nodes).find(
    (node) => node.contentType === 'container' && node.subtype === 'section',
  );
  if (!section || section.contentType !== 'container') {
    throw new Error('Expected section wrapper');
  }
  return section;
}

function addVideoNode(document: ReturnType<typeof createInitialDocument>) {
  const section = firstSection(document);
  const video = createMediaNode('video', section.id);
  document.nodes[video.id] = video;
  section.children.push(video.id);
  return video;
}

function getMediaNode(document: ReturnType<typeof createInitialDocument>, id: string): MediaNode {
  const node = document.nodes[id];
  if (node.contentType !== 'media') {
    throw new Error('Expected media node');
  }
  return node;
}

describe('api/documentApi media fields', () => {
  it('updates video playback flags through text fields', () => {
    const document = structuredClone(createInitialDocument());
    const video = addVideoNode(document);

    let next = setTextNodeContentDoc(document, video.id, 'videoAutoplay', 'true');
    next = setTextNodeContentDoc(next, video.id, 'videoMuted', 'false');
    next = setTextNodeContentDoc(next, video.id, 'videoControls', 'false');
    next = setTextNodeContentDoc(next, video.id, 'videoLoop', 'true');

    expect(getMediaNode(next, video.id).video).toMatchObject({
      autoplay: true,
      muted: false,
      controls: false,
      loop: true,
    });
  });

  it('sets and clears the poster url', () => {
    const document = structuredClone(createInitialDocument());
    const video = addVideoNode(document);

    const withPoster = setTextNodeContentDoc(document, video.id, 'videoPoster', 'https://example.com/poster.jpg');
    expect(getMediaNode(withPoster, video.id).video?.poster).toBe('https://example.com/poster.jpg');

    const cleared = setTextNodeContentDoc(withPoster, video.id, 'videoPoster', '  ');
    expect(getMediaNode(cleared, video.id).video?.poster).toBeUndefined();
  });

  it('normalizes preload to auto for unknown values', () => {
    const document = structuredClone(createInitialDocument());
    const video = addVideoNode(document);

    const metadata = setTextNodeContentDoc(document, video.id, 'videoPreload', 'metadata');
    expect(getMediaNode(metadata, video.id).video?.preload).toBe('metadata');

    const bogus = setTextNodeContentDoc(metadata, video.id, 'videoPreload', 'eager');
    expect(getMediaNode(bogus, video.id).video?.preload).toBe('auto');
  });

  it('updates and validates media object fit and position', () => {
    const document = structuredClone(createInitialDocument());
    const video = addVideoNode(document);

    const cover = setTextNodeContentDoc(document, video.id, 'objectFit', 'cover');
    expect(getMediaNode(cover, video.id).style?.objectFit).toBe('cover');

    const invalid = setTextNodeContentDoc(cover, video.id, 'objectFit', 'stretch');
    expect(getMediaNode(invalid, video.id).style?.objectFit).toBeUndefined();

    const positioned = setTextNodeContentDoc(invalid, video.id, 'objectPosition', 'left top');
    expect(getMediaNode(positioned, video.id).style?.objectPosition).toBe('left top');

    const clearedPosition = setTextNodeContentDoc(positioned, video.id, 'objectPosition', '');
    expect(getMediaNode(clearedPosition, video.id).style?.objectPosition).toBeUndefined();
  });

  it('ignores video-only fields on non-video media', () => {
    const document = structuredClone(createInitialDocument());
    const section = firstSection(document);
    const image = createMediaNode('image', section.id);
    document.nodes[image.id] = image;
    section.children.push(image.id);

    const next = setTextNodeContentDoc(document, image.id, 'videoAutoplay', 'true');
    expect(getMediaNode(next, image.id).video).toBeUndefined();
  });
});

describe('api/documentApi adoptVideoIntrinsicRatioDoc', () => {
  it('adopts the intrinsic ratio when height still follows the default aspect', () => {
    const document = structuredClone(createInitialDocument());
    const video = addVideoNode(document);

    const next = adoptVideoIntrinsicRatioDoc(document, video.id, 4 / 3);
    const node = getMediaNode(next, video.id);
    expect(node.video?.intrinsicRatio).toBeCloseTo(4 / 3, 3);
    const heightParsed = node.rect.height.base.parsed;
    expect('unit' in heightParsed || !('ratio' in heightParsed) ? null : heightParsed.ratio).toBeCloseTo(4 / 3, 3);
  });

  it('keeps following the intrinsic ratio when the source changes', () => {
    const document = structuredClone(createInitialDocument());
    const video = addVideoNode(document);

    const first = adoptVideoIntrinsicRatioDoc(document, video.id, 4 / 3);
    const second = adoptVideoIntrinsicRatioDoc(first, video.id, 1);
    const node = getMediaNode(second, video.id);
    const heightParsed = node.rect.height.base.parsed;
    expect('unit' in heightParsed || !('ratio' in heightParsed) ? null : heightParsed.ratio).toBeCloseTo(1, 3);
  });

  it('preserves a user-authored aspect ratio', () => {
    const document = structuredClone(createInitialDocument());
    const video = addVideoNode(document);
    const node = getMediaNode(document, video.id);
    node.rect.height.base = parseHeightValue('aspect-ratio(2/1)');

    const next = adoptVideoIntrinsicRatioDoc(document, video.id, 4 / 3);
    const updated = getMediaNode(next, video.id);
    expect(updated.video?.intrinsicRatio).toBeCloseTo(4 / 3, 3);
    const heightParsed = updated.rect.height.base.parsed;
    expect('unit' in heightParsed || !('ratio' in heightParsed) ? null : heightParsed.ratio).toBe(2);
  });

  it('returns the identical document for invalid input or non-video nodes', () => {
    const document = structuredClone(createInitialDocument());
    const video = addVideoNode(document);

    expect(adoptVideoIntrinsicRatioDoc(document, video.id, 0)).toBe(document);
    expect(adoptVideoIntrinsicRatioDoc(document, video.id, Number.NaN)).toBe(document);
    expect(adoptVideoIntrinsicRatioDoc(document, 'missing', 1)).toBe(document);

    const adopted = adoptVideoIntrinsicRatioDoc(document, video.id, 1.5);
    expect(adoptVideoIntrinsicRatioDoc(adopted, video.id, 1.5)).toBe(adopted);
  });
});
