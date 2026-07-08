import { describe, expect, it } from 'vitest';
import { createButtonTextNode, createMediaNode, createTextNode } from '../../model/defaults';
import { CODE_THEME_SURFACE } from '../../model/textNodeDefaults';
import { parseUnitValue } from '../../model/units';
import {
  SVG_MONOCHROME_FILL_TARGET_SELECTOR,
  getButtonLeafStyle,
  getCodeLeafStyle,
  getImageLeafStyle,
  getLeafInlineStyle,
  getSiteLeafBaseRules,
  getStandaloneCodePreStyle,
} from '../leafPresentation';

describe('render/leafPresentation', () => {
  it('keeps SVG monochrome fill overrides away from explicit no-fill shapes', () => {
    const rules = getSiteLeafBaseRules({
      text: '.text',
      blockquoteText: '.blockquote-text',
      table: '.table',
      tableCell: '.table :where(th, td)',
      linkAnchor: '.link-anchor',
      imageLink: '.image-link',
      image: '.image',
      brandMarkImage: '.brand-mark-image',
      imagePlaceholder: '.image-placeholder',
      video: '.video',
      videoFrame: '.video-frame',
      videoMedia: '.video-media',
      videoTitle: '.video-title',
      videoDescription: '.video-description',
      svg: '.svg',
      button: '.button',
    });
    const monochromeRule = rules.find((rule) => rule.selector.includes('.sp-svg-mono'));

    expect(monochromeRule?.selector).toBe(`.svg.sp-svg-mono ${SVG_MONOCHROME_FILL_TARGET_SELECTOR}`);
    expect(monochromeRule?.selector).toContain(':not([fill="none" i])');
    expect(monochromeRule?.selector).toContain(':not([fill="transparent" i])');
    expect(monochromeRule?.selector).toContain(':not([color="none" i])');
    expect(monochromeRule?.selector).toContain(':not([color="transparent" i])');
    expect(monochromeRule?.selector).toContain(':not([fill-opacity="0"])');
    expect(monochromeRule?.selector).toContain(':not([style*="fill: none" i])');
    expect(monochromeRule?.selector).toContain(':not([style*="color: transparent" i])');
    expect(monochromeRule?.selector).toContain(':not([style*="fill-opacity: 0" i])');
    expect(monochromeRule?.style.color).toBe('inherit !important');
    expect(monochromeRule?.style.fill).toBe('currentColor !important');
  });

  it('fades visible video titles in on hover, focus, and paused media state', () => {
    const rules = getSiteLeafBaseRules({
      text: '.text',
      blockquoteText: '.blockquote-text',
      table: '.table',
      tableCell: '.table :where(th, td)',
      linkAnchor: '.link-anchor',
      imageLink: '.image-link',
      image: '.image',
      brandMarkImage: '.brand-mark-image',
      imagePlaceholder: '.image-placeholder',
      video: '.video',
      videoFrame: '.video-frame',
      videoMedia: '.video-media',
      videoTitle: '.video-title',
      videoDescription: '.video-description',
      svg: '.svg',
      button: '.button',
    });
    const titleRule = rules.find((rule) => rule.selector === '.video-title');
    const revealRule = rules.find((rule) => rule.selector.includes(':has(.video-media:paused)'));

    expect(titleRule?.style.opacity).toBe(0);
    expect(titleRule?.style.transition).toBe('opacity 500ms ease');
    expect(revealRule?.selector).toContain('.video-frame:is(:hover, :focus-within) .video-title');
    expect(revealRule?.selector).toContain('.video-frame:has(.video-media:paused) .video-title');
    expect(revealRule?.style.opacity).toBe(1);
  });

  it('uses shared default button presentation even without authored border or shadow overrides', () => {
    const button = createButtonTextNode('root');
    if (button.subtype !== 'block') {
      throw new Error('Expected button leaf');
    }
    const style = getButtonLeafStyle(button);

    expect(style.display).toBe('block');
    expect(style.width).toBe('100%');
    expect(style.minWidth).toBe('min-content');
    expect(style.maxWidth).toBe('100%');
    expect(style.boxSizing).toBe('border-box');
    expect(style.backgroundColor).toBe('#05070a');
    expect(style.borderRadius).toBe('999px');
    expect(style.boxShadow).toBe('0px 10px 18px rgba(5, 7, 10, 0.16)');
    expect(style.filter).toBeUndefined();
    expect(style.paddingBlock).toBe('13px');
    expect(style.paddingInline).toBe('24px');
  });

  it('does not add filter shadows to buttons when box shadow is present', () => {
    const button = createButtonTextNode('root');
    if (button.subtype !== 'block') {
      throw new Error('Expected button leaf');
    }
    button.style ??= {};
    button.style!.shadowColor = 'rgba(15, 23, 42, 0.15)';
    button.style!.shadowBlur = 14;
    button.style!.shadowOffsetY = 8;

    const style = getButtonLeafStyle(button);

    expect(style.boxShadow).toBe('0px 8px 14px rgba(15, 23, 42, 0.15)');
    expect(style.filter).toBeUndefined();
  });

  it('uses shared default image presentation even without authored border or shadow overrides', () => {
    const image = createMediaNode('image', 'root');
    if (image.subtype !== 'image') {
      throw new Error('Expected image leaf');
    }
    const style = getImageLeafStyle(image);

    expect(style.overflow).toBe('hidden');
    expect(style.borderStyle).toBe('solid');
    expect(style.borderWidth).toBe('1px');
    expect(style.borderColor).toBe('#d8e0ea');
    expect(style.borderRadius).toBe('16px');
    expect(style.boxShadow).toBe('0px 12px 28px rgba(18, 32, 51, 0.12)');
  });

  it('keeps authored image overrides on the shared presentation path', () => {
    const image = createMediaNode('image', 'root');
    if (image.subtype !== 'image') {
      throw new Error('Expected image leaf');
    }
    image.style ??= {};
    image.style!.borderRadius = parseUnitValue('28px');
    image.style!.shadowBlur = 18;
    image.style!.shadowOffsetY = 12;
    image.style!.shadowColor = 'rgba(37, 99, 235, 0.2)';

    const style = getImageLeafStyle(image);

    expect(style.borderRadius).toBe('28px');
    expect(style.boxShadow).toBe('0px 12px 18px rgba(37, 99, 235, 0.2)');
  });

  it('lets zero-valued border fields and fully transparent shadows suppress rendered defaults', () => {
    const image = createMediaNode('image', 'root');
    const button = createButtonTextNode('root');
    if (image.subtype !== 'image' || button.subtype !== 'block') {
      throw new Error('Expected image and button leaves');
    }

    image.style ??= {};
    image.style!.borderWidth = parseUnitValue('0px');
    image.style!.borderRadius = parseUnitValue('0px');
    image.style!.shadowColor = 'rgba(18, 32, 51, 0)';

    button.style ??= {};
    button.style!.borderRadius = parseUnitValue('0px');
    button.style!.shadowColor = 'rgba(5, 7, 10, 0)';

    const imageStyle = getImageLeafStyle(image);
    const buttonStyle = getButtonLeafStyle(button);

    expect(imageStyle.borderStyle).toBeUndefined();
    expect(imageStyle.borderWidth).toBeUndefined();
    expect(imageStyle.borderColor).toBeUndefined();
    expect(imageStyle.borderRadius).toBeUndefined();
    expect(imageStyle.boxShadow).toBeUndefined();
    expect(buttonStyle.borderRadius).toBeUndefined();
    expect(buttonStyle.boxShadow).toBeUndefined();
  });

  it('keeps code nodes on the code presentation path even when block-only link fields leak in', () => {
    const code = createTextNode('code', 'root');
    code.link = { linkType: 'external', href: 'https://example.com' };
    code.style = { ...code.style, background: '#101418' };

    const style = getLeafInlineStyle(code);

    expect(style.fontFamily).toContain('monospace');
    expect(style.display).toBe('block');
    expect(style.width).toBeUndefined();
    expect(style.filter).toBeUndefined();
  });

  it('splits code node wrapper and pre surface styles', () => {
    const code = createTextNode('code', 'root');
    const wrapperStyle = getCodeLeafStyle(code);
    const preStyle = getStandaloneCodePreStyle(code);

    expect(wrapperStyle.display).toBe('block');
    expect(wrapperStyle.maxWidth).toBe('100%');
    expect(wrapperStyle.fontFamily).toContain('monospace');
    expect(wrapperStyle.filter).toBeUndefined();
    expect(preStyle.display).toBe('block');
    expect(preStyle.width).toBe('100%');
    expect(preStyle.margin).toBe(0);
    expect(preStyle.whiteSpace).toBe('pre-wrap');
    expect(preStyle.wordBreak).toBe('break-word');
    expect(preStyle.overflowWrap).toBe('anywhere');
    expect(preStyle.wordWrap).toBe('break-word');
    expect(preStyle.backgroundColor).toBe(code.style?.background);
  });

  it('keeps theme-owned code surfaces out of idle inline styles', () => {
    const code = createTextNode('code', 'root');
    code.style = {
      ...code.style,
      color: CODE_THEME_SURFACE.light.color,
      background: CODE_THEME_SURFACE.light.background,
    };

    const wrapperStyle = getCodeLeafStyle(code);
    const preStyle = getStandaloneCodePreStyle(code);

    expect(wrapperStyle.color).toBeUndefined();
    expect(preStyle.backgroundColor).toBeUndefined();
  });

  it('keeps code node shadows on box-shadow without adding a duplicate filter shadow', () => {
    const code = createTextNode('code', 'root');
    code.style ??= {};
    code.style.shadowColor = 'rgba(15, 23, 42, 0.18)';
    code.style.shadowBlur = 16;
    code.style.shadowOffsetX = 4;
    code.style.shadowOffsetY = 8;

    const wrapperStyle = getCodeLeafStyle(code);
    const preStyle = getStandaloneCodePreStyle(code);

    expect(wrapperStyle.filter).toBeUndefined();
    expect(preStyle.boxShadow).toBe('4px 8px 16px rgba(15, 23, 42, 0.18)');
  });

  it('keeps rich text on the plain text presentation path even when block-only link fields leak in', () => {
    const rich = createTextNode('rich', 'root');
    rich.link = { linkType: 'external', href: 'https://example.com' };

    const style = getLeafInlineStyle(rich);

    expect(style.whiteSpace).toBe('pre-wrap');
    expect(style.display).toBeUndefined();
    expect(style.width).toBeUndefined();
  });

  it('keeps list text on the plain text presentation path even when block-only link fields leak in', () => {
    const list = createTextNode('list', 'root');
    list.link = { linkType: 'external', href: 'https://example.com' };

    const style = getLeafInlineStyle(list);

    expect(style.whiteSpace).toBe('pre-wrap');
    expect(style.display).toBeUndefined();
    expect(style.width).toBeUndefined();
  });
});
