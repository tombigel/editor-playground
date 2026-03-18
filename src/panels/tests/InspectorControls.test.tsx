import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { forceOpaqueColorValue } from '../../model/colors';
import type { DocumentFontFamily } from '../../model/types';
import {
  applyPersistentSelectValueChange,
  BorderControlGroup,
  convertStageBorderRadiusToValue,
  convertStageSpacingToInput,
  FontFamilySelect,
  FontPickerPopover,
  FontSizeField,
  FontWeightSelect,
  HoverColorField,
  orderFontFamiliesForPicker,
  ShadowControlGroup,
  offsetsFromDistanceAndAngle,
  readShadowFieldValues,
  validateNumberInputDraft,
} from '../InspectorControls';

describe('panels/InspectorControls', () => {
  it('strips alpha from color values used in non-alpha fields', () => {
    expect(forceOpaqueColorValue('#336699cc')).toBe('#336699');
    expect(forceOpaqueColorValue('rgb(12 34 56 / 25%)')).toBe('rgb(12 34 56)');
    expect(forceOpaqueColorValue('rgba(12, 34, 56, 0.4)')).toBe('rgb(12, 34, 56)');
    expect(forceOpaqueColorValue('oklch(70% 0.2 250 / 0.7)')).toBe('oklch(70% 0.2 250)');
    expect(forceOpaqueColorValue('color(display-p3 0.24 0.52 0.88 / 0.9)')).toBe('color(display-p3 0.24 0.52 0.88)');
  });

  it('renders color controls inline with the advanced color picker element', () => {
    const markup = renderToStaticMarkup(
      <HoverColorField value="oklch(62% 0.18 252 / 0.8)" onChange={() => {}} ariaLabel="Text color" />,
    );

    expect(markup).toContain('<color-input');
    expect(markup).toContain('data-ui="color-picker"');
    expect(markup).toContain('aria-label="Text color"');
    expect(markup).toContain('value="oklch(62% 0.18 252 / 0.8)"');
    expect(markup).toContain('editor-color-picker');
    expect(markup).toContain('h-8 w-8');
  });

  it('renders shadow numeric controls with compact fixed unit suffixes', () => {
    const markup = renderToStaticMarkup(
      <ShadowControlGroup
        color="rgb(0 0 0 / 0.4)"
        blur={12}
        spread={6}
        distance={24}
        angle={45}
        colorFallback="#000000"
        supportsSpread
        onColorChange={() => {}}
        onBlurChange={() => {}}
        onSpreadChange={() => {}}
        onDistanceChange={() => {}}
        onAngleChange={() => {}}
      />,
    );

    expect(markup).toContain('>Blur<');
    expect(markup).toContain('>Spread<');
    expect(markup).toContain('>Distance<');
    expect(markup).toContain('>Angle<');
    expect(markup.match(/>px</g)?.length).toBe(3);
    expect(markup).toContain('>°<');
  });

  it('renders border controls with a unit selector for radius', () => {
    const markup = renderToStaticMarkup(
      <BorderControlGroup
        nodeId="button_1"
        colorValue="rgb(216 224 234 / 1)"
        widthValue="1px"
        radiusValue="16%"
        onColorChange={() => {}}
        onWidthChange={() => {}}
        onRadiusChange={() => {}}
      />,
    );

    expect(markup).toContain('aria-label="Border color"');
    expect(markup).toContain('data-allow-alpha="true"');
    expect(markup).toContain('>Width<');
    expect(markup).toContain('>Radius<');
    expect(markup.match(/min="0"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(markup).toContain('>px<');
    expect(markup.match(/data-ui="select-trigger"/g)?.length).toBe(1);
  });

  it('renders named font weight options with family preview styling', () => {
    const markup = renderToStaticMarkup(
      <FontWeightSelect
        value={700}
        familyName="Assistant"
        options={[
          { value: 300, label: 'Light' },
          { value: 400, label: 'Normal' },
          { value: 700, label: 'Bold' },
        ]}
        onChange={() => {}}
      />,
    );

    expect(markup).toContain('Bold');
    expect(markup).toContain('font-weight:700');
    expect(markup).toContain("font-family:Assistant, system-ui, -apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, sans-serif");
    expect(markup).not.toContain('editor-text-muted truncate text-[10px]');
  });

  it('renders the font family menu as a larger single-line list', () => {
    const markup = renderToStaticMarkup(
      <FontFamilySelect
        value="Assistant"
        families={[
          {
            family: 'Assistant',
            category: 'sans-serif',
            subsets: ['hebrew', 'latin'],
            variants: ['regular', '700'],
            isVariable: false,
            source: 'google-fonts',
            favorite: false,
            origin: 'added',
          },
        ]}
        systemOptionValue="__system-font__"
        onChange={() => {}}
      />,
    );

    expect(markup).toContain('text-[13px]');
    expect(markup).not.toContain('System default');
    expect(markup).not.toContain('Browser fallback stack');
    expect(markup).not.toContain('hebrew');
    expect(markup).not.toContain('general');
    expect(markup).not.toContain(' · ');
  });

  it('renders the combined font picker with nested family and weight lists', () => {
    const markup = renderToStaticMarkup(
      <FontPickerPopover
        familyValue="Assistant"
        weightValue={700}
        families={[
          {
            family: 'Assistant',
            category: 'sans-serif',
            subsets: ['hebrew', 'latin'],
            variants: ['regular', '700'],
            isVariable: false,
            source: 'google-fonts',
            favorite: false,
            origin: 'added',
          },
          {
            family: 'Lora',
            category: 'serif',
            subsets: ['latin'],
            variants: ['regular', '700'],
            isVariable: false,
            source: 'google-fonts',
            favorite: false,
            origin: 'added',
          },
        ]}
        systemOptionValue="__system-font__"
        onFamilyChange={() => {}}
        onWeightChange={() => {}}
        defaultOpen
      />,
    );

    expect(markup).toContain('Sans Serif');
    expect(markup).toContain('Assistant');
    expect(markup).toContain('Lora');
    expect(markup).toContain('Bold');
    expect(markup).toContain('Normal');
    expect(markup).toContain('w-[352px]');
    expect(markup).toContain('grid-cols-[minmax(0,1fr)_140px]');
    expect(markup).toContain('ui-popover-surface');
    expect(markup).toContain('popover="manual"');
    expect(markup).toContain('text-[13px] leading-4');
    expect(markup).toContain('px-[3px]');
    expect(markup).toContain('hover:text-[color:var(--editor-accent)]');
    expect(markup).toContain('hover:[background:var(--editor-select-highlight-background)]');
    expect(markup).toContain('text-[color:var(--editor-accent)] [background:var(--editor-select-highlight-background)]');
    expect(markup).not.toContain('ring-1 ring-[color:var(--editor-accent)]');
    expect(markup).not.toContain('editor-text-muted ml-2 shrink-0 text-[10px]');
    expect(markup.match(/lucide-check/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('renders font size suggestions with shared hover treatment and the 72px preset', () => {
    const markup = renderToStaticMarkup(<FontSizeField nodeId="text_1" value="16px" onChange={() => {}} defaultSuggestionsOpen />);

    expect(markup).toContain('72px');
    expect(markup).toContain('hover:[background:var(--editor-select-highlight-background)]');
    expect(markup).toContain('leading-5');
    expect(markup).toContain('py-2');
    expect(markup).toContain('max-h-[220px]');
    expect(markup).toContain('editor-scrollbar');
    expect(markup).toContain('overflow-y-auto');
  });

  it('orders picker fonts by recents first and then by language', () => {
    const families: DocumentFontFamily[] = [
      {
        family: 'Lora',
        category: 'serif',
        subsets: ['latin'],
        variants: ['regular'],
        isVariable: false,
        source: 'google-fonts',
        favorite: false,
        origin: 'added',
      },
      {
        family: 'Assistant',
        category: 'sans-serif',
        subsets: ['hebrew', 'latin'],
        variants: ['regular'],
        isVariable: false,
        source: 'google-fonts',
        favorite: false,
        origin: 'added',
      },
      {
        family: 'Alef',
        category: 'sans-serif',
        subsets: ['hebrew'],
        variants: ['regular'],
        isVariable: false,
        source: 'google-fonts',
        favorite: false,
        origin: 'added',
      },
    ];

    expect(orderFontFamiliesForPicker([...families], ['Lora', 'Missing'])).toEqual({
      recent: [families[0]],
      byLanguage: [families[2], families[1]],
    });
  });

  it('reopens persistent select menus after a value change when requested', () => {
    const onChange = vi.fn();
    const reopen = vi.fn();

    applyPersistentSelectValueChange({
      nextValue: 'Roboto',
      keepOpenOnSelect: true,
      onChange,
      reopen,
    });

    expect(onChange).toHaveBeenCalledWith('Roboto');
    expect(reopen).toHaveBeenCalledTimes(1);

    applyPersistentSelectValueChange({
      nextValue: 'Lora',
      keepOpenOnSelect: false,
      onChange,
      reopen,
    });

    expect(onChange).toHaveBeenCalledWith('Lora');
    expect(reopen).toHaveBeenCalledTimes(1);
  });

  it('passes opaque values to non-alpha color fields', () => {
    const markup = renderToStaticMarkup(
      <HoverColorField
        value="oklch(62% 0.18 252 / 0.8)"
        onChange={() => {}}
        ariaLabel="Bottom border color"
        fallback="#dbe3ee"
        showOpacity={false}
      />,
    );

    expect(markup).toContain('value="oklch(62% 0.18 252)"');
    expect(markup).toContain('data-allow-alpha="false"');
  });

  it('preserves authored shadow angle through distance/offset round-trips', () => {
    const fourDegreeOffsets = offsetsFromDistanceAndAngle(10, 4);
    const fortyFiveDegreeOffsets = offsetsFromDistanceAndAngle(18, 45);
    const threeFifteenDegreeOffsets = offsetsFromDistanceAndAngle(20, 315);

    expect(
      readShadowFieldValues(
        {
          shadowOffsetX: fourDegreeOffsets.offsetX,
          shadowOffsetY: fourDegreeOffsets.offsetY,
        },
        { color: '#000000', blur: 0, spread: 0, distance: 0, angle: 0 },
      ).angle,
    ).toBe(4);

    expect(
      readShadowFieldValues(
        {
          shadowOffsetX: fortyFiveDegreeOffsets.offsetX,
          shadowOffsetY: fortyFiveDegreeOffsets.offsetY,
        },
        { color: '#000000', blur: 0, spread: 0, distance: 0, angle: 0 },
    ).angle,
    ).toBe(45);

    expect(
      readShadowFieldValues(
        {
          shadowOffsetX: threeFifteenDegreeOffsets.offsetX,
          shadowOffsetY: threeFifteenDegreeOffsets.offsetY,
        },
        { color: '#000000', blur: 0, spread: 0, distance: 0, angle: 0 },
      ).angle,
    ).toBe(315);
  });

  it('reads shadow spread directly from authored style', () => {
    expect(
      readShadowFieldValues(
        {
          shadowSpread: 14,
        },
        { color: '#000000', blur: 0, spread: 0, distance: 0, angle: 0 },
      ).spread,
    ).toBe(14);
  });

  it('treats empty shadow number drafts as invalid until the field blurs', () => {
    expect(validateNumberInputDraft('', 0, 200)).toEqual({
      isValid: false,
      nextValue: null,
    });
    expect(validateNumberInputDraft('  ', 0, 200)).toEqual({
      isValid: false,
      nextValue: null,
    });
    expect(validateNumberInputDraft('24', 0, 200)).toEqual({
      isValid: true,
      nextValue: 24,
    });
  });

  it('converts rendered spacing into target units instead of swapping suffixes', () => {
    const button = {
      querySelector: () => null,
      getBoundingClientRect: () => ({ width: 200, height: 48 }),
      parentElement: {},
    };
    const stageShell = {
      getBoundingClientRect: () => ({ width: 1200, height: 900 }),
    };
    const ownerDocument = {
      getElementById: (id: string) => (id === 'stage-node-button_1' ? button : null),
      querySelector: (selector: string) => (selector === '.stage-shell' ? stageShell : null),
      documentElement: {},
      defaultView: {
        getComputedStyle: (target: unknown) => {
          if (target === button) {
            return {
              paddingTop: '23.6px',
              paddingBottom: '24px',
              paddingLeft: '32px',
              paddingRight: '31.6px',
              fontSize: '20px',
            };
          }
          return {
            fontSize: '16px',
            paddingLeft: '0px',
            paddingRight: '0px',
            paddingTop: '0px',
            paddingBottom: '0px',
          };
        },
      },
    } as unknown as Document;

    expect(convertStageSpacingToInput('button_1', 'block', 'em', ownerDocument)).toBe('1.19');
    expect(convertStageSpacingToInput('button_1', 'inline', 'rem', ownerDocument)).toBe('1.99');
    expect(convertStageSpacingToInput('button_1', 'top', 'em', ownerDocument)).toBe('1.18');
    expect(convertStageSpacingToInput('button_1', 'right', 'rem', ownerDocument)).toBe('1.98');
    expect(convertStageSpacingToInput('button_1', 'top', 'px', ownerDocument)).toBe('24');
    expect(convertStageSpacingToInput('button_1', 'right', 'px', ownerDocument)).toBe('32');
  });

  it('converts rendered border radius into target units instead of swapping suffixes', () => {
    const wrapper = {
      querySelector: (selector: string) => (
        selector === '[data-content-wrapper-for="container_1"]'
          ? {
              getBoundingClientRect: () => ({ width: 240, height: 120 }),
            }
          : null
      ),
    };
    const ownerDocument = {
      getElementById: (id: string) => (id === 'stage-node-container_1' ? wrapper : null),
      defaultView: {
        getComputedStyle: () => ({
          borderTopLeftRadius: '18px',
        }),
      },
    } as unknown as Document;

    expect(convertStageBorderRadiusToValue('container_1', '%', ownerDocument)).toBe('10%');
  });
});
