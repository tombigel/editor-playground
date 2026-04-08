import { describe, expect, it } from 'vitest';
import { createButtonTextNode, createMediaNode, createTextNode } from '../../model/defaults';
import { parseUnitValue } from '../../model/units';
import { getButtonLeafStyle, getImageLeafStyle, getLeafInlineStyle } from '../leafPresentation';

describe('render/leafPresentation', () => {
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
    expect(style.background).toBe('#05070a');
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
    expect(style.background).toBe('#101418');
    expect(style.display).toBeUndefined();
    expect(style.width).toBeUndefined();
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
