import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument, createLeaf, createWrapper } from '../../model/defaults';
import {
  buildSizeFieldValue,
  convertRenderedPxToFontSizeValue,
  convertStageFontSizeToInput,
  convertStageMeasurementToInput,
  convertRenderedPxToUnitValue,
  describeSizeFieldValue,
  getSizeModeOptions,
  InspectorPanel,
  type InspectorPanelProps,
  NumericUnitInlineField,
  normalizeAspectRatioExpression,
  SizeInlineField,
} from '../InspectorPanel';

describe('panels/InspectorPanel', () => {
  function makeBaseInspectorProps(overrides?: Partial<InspectorPanelProps>): InspectorPanelProps {
    return {
      node: null,
      showOrderControls: false,
      canOrderBack: false,
      canOrderForward: false,
      canSendToBack: false,
      canBringToFront: false,
      orderBackShortcut: '',
      orderForwardShortcut: '',
      sendToBackShortcut: '',
      bringToFrontShortcut: '',
      canSectionBack: false,
      canSectionForward: false,
      onOrderBack: () => {},
      onOrderForward: () => {},
      onSendToBack: () => {},
      onBringToFront: () => {},
      onSectionBack: () => {},
      onSectionForward: () => {},
      onTextChange: () => {},
      onWrapperStyleChange: () => {},
      onRectChange: () => {},
      onPromote: () => {},
      onDemote: () => {},
      onStickyEnabled: () => {},
      onStickyTarget: () => {},
      onStickyEdges: () => {},
      onStickyOffset: () => {},
      onStickyOffsetTop: () => {},
      onStickyOffsetBottom: () => {},
      onStickyDurationMode: () => {},
      onStickyDuration: () => {},
      onStickyDurationTop: () => {},
      onStickyDurationBottom: () => {},
      focusedMode: null,
      onEnterFocusedMode: () => {},
      globalStickyElevation: true,
      onStickyElevation: () => undefined,
      onStickyElevated: () => undefined,
      ...overrides,
    };
  }

  it('renders the shared 3-button section type selector with the current type selected', () => {
    const document = createInitialDocument();
    const headerNode = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'header',
    );

    if (!headerNode || headerNode.type !== 'wrapper') {
      throw new Error('Expected header wrapper');
    }

    const markup = renderToStaticMarkup(
      <InspectorPanel {...makeBaseInspectorProps({ node: headerNode })} />,
    );

    expect(markup).toContain('Section type');
    expect(markup).toContain('Set type to Section');
    expect(markup).toContain('Set type to Header');
    expect(markup).toContain('Set type to Footer');
    expect(markup).not.toContain('Playground Header');
    expect(markup).not.toContain('aria-label="Edit title"');
    expect(markup).not.toContain('>Properties<');
    expect(markup.match(/aria-pressed="true"/g)?.length).toBe(1);
  });

  it('renders section-only bottom divider controls in wrapper design', () => {
    const document = createInitialDocument();
    const sectionNode = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section' && node.name === 'Post Layout',
    );

    if (!sectionNode || sectionNode.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    const markup = renderToStaticMarkup(
      <InspectorPanel {...makeBaseInspectorProps({ node: sectionNode })} />,
    );

    expect(markup).toContain('Divider');
    expect(markup).toContain('Background color');
    expect(markup).toContain('Bottom border color');
    expect(markup).not.toContain('Bottom border color opacity');
    expect(markup.match(/data-allow-alpha="false"/g)?.length).toBe(2);
    expect(markup).not.toContain('data-allow-alpha="true"');
    expect(markup).not.toContain('>Border<');
    expect(markup).not.toContain('>Shadow<');
    expect(markup).toContain('placeholder="1"');
    expect(markup).toContain('min="0"');
    expect(markup).toContain('>px<');
    expect(markup).toContain('aria-label="Go to Layout focus mode"');
    expect(markup).toContain('aria-label="Go to Sticky focus mode"');
    expect(markup).toContain('aria-label="Go to Design focus mode"');
    expect(markup.indexOf('>Layout<')).toBeLessThan(markup.indexOf('>Sticky<'));
    expect(markup.indexOf('>Sticky<')).toBeLessThan(markup.indexOf('>Design<'));
  });

  it('renders border and shadow controls for container wrapper design', () => {
    const containerNode = createWrapper('container', 'root');

    const markup = renderToStaticMarkup(
      <InspectorPanel {...makeBaseInspectorProps({ node: containerNode })} />,
    );

    expect(markup).toContain('>Border<');
    expect(markup).toContain('>Shadow<');
    expect(markup).toContain('>Spread<');
    expect(markup).not.toContain('Divider');
    expect(markup).toContain('data-allow-alpha="true"');
    expect(markup.indexOf('>Layout<')).toBeLessThan(markup.indexOf('>Sticky<'));
    expect(markup.indexOf('>Sticky<')).toBeLessThan(markup.indexOf('>Design<'));
  });

  it('renders the dedicated multi-select inspector for multiple selected nodes', () => {
    const textNode = createLeaf('text', 'section_1');
    const buttonNode = createLeaf('button', 'section_1');

    const markup = renderToStaticMarkup(
      <InspectorPanel
        {...makeBaseInspectorProps({
          node: textNode,
          selectedNodes: [textNode, buttonNode],
          showOrderControls: true,
          canOrderBack: true,
          canOrderForward: true,
          canSendToBack: true,
          canBringToFront: true,
          onAlignSelection: () => {},
          onDistributeSelection: () => {},
          onBulkEdit: () => {},
        })}
      />,
    );

    expect(markup).toContain('First selected node is the alignment anchor.');
    expect(markup).not.toContain('>Multi-select<');
    expect(markup).toContain('>Layout<');
    expect(markup).toContain('>Sticky<');
    expect(markup).toContain('>Typography<');
    expect(markup.indexOf('>Layout<')).toBeLessThan(markup.indexOf('>Sticky<'));
    expect(markup.indexOf('>Sticky<')).toBeLessThan(markup.indexOf('>Typography<'));
    expect(markup).toContain('class="ml-auto flex min-w-0 items-center justify-end gap-1" style="width:172px"');
    expect(markup).toContain('class="shrink-0" style="width:136px"');
    expect(markup).toContain('class="relative w-full"');
    expect(markup).toContain('class="ml-auto flex min-w-0 items-center justify-end" style="width:172px"');
    expect(markup).toContain('class="grid w-full items-center gap-1" style="grid-template-columns:112px 56px"');
    expect(markup).toContain('class="shrink-0" style="width:112px"');
    expect(markup).toContain('class="shrink-0" style="width:56px"');
    expect(markup).toContain('aria-label="Manage fonts"');
    expect(markup).not.toContain('class="h-8 rounded-sm text-[11px] w-[72px]"');
  });

  it('shows a disabled width field for top-level wrappers locked to 100%', () => {
    const document = createInitialDocument();
    const wrapperRoles: Array<'section' | 'header' | 'footer'> = ['section', 'header', 'footer'];

    for (const role of wrapperRoles) {
      const wrapperNode = Object.values(document.nodes).find(
        (node) => node.type === 'wrapper' && node.role === role,
      );

      if (!wrapperNode || wrapperNode.type !== 'wrapper') {
        throw new Error(`Expected ${role} wrapper`);
      }

      const markup = renderToStaticMarkup(
        <InspectorPanel {...makeBaseInspectorProps({ node: wrapperNode })} />,
      );

      expect(markup).toContain('>W<');
      expect(markup).toContain('value="100"');
      expect(markup).toContain('disabled=""');
    }
  });

  it('shows fixed auto duration state for top-level self sticky wrappers', () => {
    const document = createInitialDocument();
    const sectionNode = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!sectionNode || sectionNode.type !== 'wrapper') {
      throw new Error('Expected section wrapper');
    }

    sectionNode.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: false },
      durationMode: 'custom',
      duration: { raw: '100vh', parsed: { value: 100, unit: 'vh' } },
      durationTop: { raw: '100vh', parsed: { value: 100, unit: 'vh' } },
      durationBottom: { raw: '100vh', parsed: { value: 100, unit: 'vh' } },
      offsetTop: { raw: '0vh', parsed: { value: 0, unit: 'vh' } },
    };

    const markup = renderToStaticMarkup(
      <InspectorPanel {...makeBaseInspectorProps({ node: sectionNode })} />,
    );

    expect(markup).toContain('Uses the page height as the sticky distance.');
    expect(markup).toContain('>Auto<');
    expect(markup).not.toContain('>Custom<');
  });

  it('hides the sticky target field for wrapper nodes', () => {
    const document = createInitialDocument();
    const containerNode = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section',
    );

    if (!containerNode || containerNode.type !== 'wrapper') {
      throw new Error('Expected wrapper node');
    }

    containerNode.sticky = {
      enabled: true,
      target: 'self',
      edges: { top: true, bottom: false },
      durationMode: 'auto',
      duration: { raw: '50vh', parsed: { value: 50, unit: 'vh' } },
      durationTop: { raw: '50vh', parsed: { value: 50, unit: 'vh' } },
      durationBottom: { raw: '50vh', parsed: { value: 50, unit: 'vh' } },
      offsetTop: { raw: '0vh', parsed: { value: 0, unit: 'vh' } },
    };

    const markup = renderToStaticMarkup(
      <InspectorPanel {...makeBaseInspectorProps({ node: containerNode })} />,
    );

    expect(markup).not.toContain('>Target<');
    expect(markup).not.toContain('>Self<');
    expect(markup).not.toContain('Content wrapper');
  });

  it('renders content and design sections for leaf inspectors', () => {
    const document = createInitialDocument();
    const sectionNode = Object.values(document.nodes).find((node) => node.type === 'wrapper' && node.role === 'section');
    if (!sectionNode || sectionNode.type !== 'wrapper') {
      throw new Error('Expected section node');
    }
    const buttonNode = createLeaf('button', sectionNode.id);
    const textNode = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'text');
    const linkNode = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'link');
    const imageNode = Object.values(document.nodes).find((node) => node.type === 'leaf' && node.role === 'image');

    if (!textNode || textNode.type !== 'leaf' || textNode.role !== 'text') {
      throw new Error('Expected text node');
    }
    if (!linkNode || linkNode.type !== 'leaf' || linkNode.role !== 'link') {
      throw new Error('Expected link node');
    }
    if (!imageNode || imageNode.type !== 'leaf' || imageNode.role !== 'image') {
      throw new Error('Expected image node');
    }
    if (buttonNode.type !== 'leaf' || buttonNode.role !== 'button') {
      throw new Error('Expected button node');
    }

    const textMarkup = renderToStaticMarkup(
      <InspectorPanel {...makeBaseInspectorProps({ node: textNode })} />,
    );

    const imageMarkup = renderToStaticMarkup(
      <InspectorPanel {...makeBaseInspectorProps({ node: imageNode })} />,
    );
    const linkMarkup = renderToStaticMarkup(
      <InspectorPanel {...makeBaseInspectorProps({ node: linkNode })} />,
    );
    const buttonMarkup = renderToStaticMarkup(
      <InspectorPanel {...makeBaseInspectorProps({ document, node: buttonNode })} />,
    );

    expect(textMarkup).toContain('>Content<');
    expect(textMarkup).toContain('>Text style<');
    expect(textMarkup).toContain('>Design<');
    expect(textMarkup).toContain('>Sticky<');
    expect(textMarkup).toContain('aria-label="Go to Layout focus mode"');
    expect(textMarkup).toContain('aria-label="Go to Sticky focus mode"');
    expect(textMarkup.match(/aria-label="Go to Content focus mode"/g)?.length).toBe(1);
    expect(textMarkup.match(/aria-label="Go to Design focus mode"/g)?.length).toBe(2);
    expect(textMarkup).toContain('>Text<');
    expect(textMarkup.indexOf('>Layout<')).toBeLessThan(textMarkup.indexOf('>Sticky<'));
    expect(textMarkup.indexOf('>Sticky<')).toBeLessThan(textMarkup.indexOf('>Content<'));
    expect(textMarkup.indexOf('>Text style<')).toBeLessThan(textMarkup.indexOf('>Design<'));
    expect(textMarkup).toContain('aria-label="Manage fonts"');
    expect(textMarkup).toContain('>Manage fonts<');
    expect(textMarkup).toContain('class="ml-auto flex min-w-0 items-center justify-end gap-1" style="width:172px"');
    expect(textMarkup).toContain('class="shrink-0" style="width:136px"');
    expect(textMarkup).toContain('class="relative w-full"');
    expect(textMarkup).toContain('class="ml-auto flex min-w-0 items-center justify-end" style="width:172px"');
    expect(textMarkup).toContain('class="grid w-full items-center gap-1" style="grid-template-columns:112px 56px"');
    expect(textMarkup).toContain('class="shrink-0" style="width:112px"');
    expect(textMarkup).toContain('class="shrink-0" style="width:56px"');
    expect(textMarkup).not.toContain('aria-label="Suggested font sizes"');
    expect(textMarkup).not.toContain('>Weight<');
    expect(textMarkup).toContain('>HTML tag<');
    expect(textMarkup).toContain('>Color<');
    expect(textMarkup).toContain('>Shadow<');
    expect(textMarkup).toContain('aria-label="Text color"');
    expect(textMarkup).toContain('data-ui="color-picker"');
    expect(linkMarkup).toContain('>Text style<');
    expect(linkMarkup).toContain('>Design<');
    expect(linkMarkup).toContain('>Sticky<');
    expect(linkMarkup).toContain('>Type<');
    expect(linkMarkup).toContain('>Internal<');
    expect(linkMarkup).toContain('>Section<');
    expect(linkMarkup).not.toContain('>Href<');
    expect(linkMarkup).not.toContain('Open in a new tab');
    expect(linkMarkup.indexOf('>Layout<')).toBeLessThan(linkMarkup.indexOf('>Sticky<'));
    expect(linkMarkup.indexOf('>Sticky<')).toBeLessThan(linkMarkup.indexOf('>Content<'));
    expect(linkMarkup.indexOf('>Text style<')).toBeLessThan(linkMarkup.indexOf('>Design<'));
    expect(linkMarkup).toContain('>Wrap<');
    expect(linkMarkup.match(/>Wrap</g)?.length).toBe(1);
    expect(linkMarkup).toContain('aria-label="Single line"');
    expect(linkMarkup).toContain('>Color<');
    expect(linkMarkup).toContain('>Shadow<');
    expect(imageMarkup).toContain('>Content<');
    expect(imageMarkup).toContain('>Design<');
    expect(imageMarkup).toContain('>Sticky<');
    expect(imageMarkup).not.toContain('>Image<');
    expect(imageMarkup.indexOf('>Layout<')).toBeLessThan(imageMarkup.indexOf('>Sticky<'));
    expect(imageMarkup.indexOf('>Sticky<')).toBeLessThan(imageMarkup.indexOf('>Content<'));
    expect(imageMarkup).toContain('>Src<');
    expect(imageMarkup).toContain('>Alt<');
    expect(imageMarkup).toContain('>Border<');
    expect(buttonMarkup).toContain('>Text style<');
    expect(buttonMarkup).toContain('>Design<');
    expect(buttonMarkup).toContain('>Sticky<');
    expect(buttonMarkup).toContain('>Href<');
    expect(buttonMarkup).toContain('Open in a new tab');
    expect(buttonMarkup.indexOf('>Layout<')).toBeLessThan(buttonMarkup.indexOf('>Sticky<'));
    expect(buttonMarkup.indexOf('>Sticky<')).toBeLessThan(buttonMarkup.indexOf('>Content<'));
    expect(buttonMarkup.indexOf('>Text style<')).toBeLessThan(buttonMarkup.indexOf('>Design<'));
    expect(buttonMarkup).toContain('>Color<');
    expect(buttonMarkup).toContain('>Background<');
    expect(buttonMarkup).toContain('>Border<');
    expect(buttonMarkup).toContain('>Shadow<');
    expect(buttonMarkup).toContain('>Padding<');
    expect(buttonMarkup).toContain('>Radius<');
    expect(buttonMarkup).toContain('>Wrap<');
    expect(buttonMarkup.match(/>Wrap</g)?.length).toBe(1);
    expect(buttonMarkup).toContain('aria-label="Single line"');
    expect(buttonMarkup.indexOf('>Color<')).toBeLessThan(buttonMarkup.indexOf('>Background<'));
    expect(buttonMarkup.indexOf('>Background<')).toBeLessThan(buttonMarkup.indexOf('>Border<'));
    expect(buttonMarkup.indexOf('>Border<')).toBeLessThan(buttonMarkup.indexOf('>Shadow<'));
    expect(buttonMarkup.indexOf('>Shadow<')).toBeLessThan(buttonMarkup.indexOf('>Padding<'));
  });

  it('renders anchor link controls with section choices and a broken-link warning', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section' && node.name === 'Post Layout',
    );
    const linkNode = Object.values(document.nodes).find(
      (node) => node.type === 'leaf' && node.role === 'link' && node.name === 'Post Link',
    );

    if (!section || section.type !== 'wrapper' || !linkNode || linkNode.type !== 'leaf' || linkNode.role !== 'link') {
      throw new Error('Expected section and link node');
    }

    linkNode.linkType = 'anchor';
    linkNode.anchorTargetId = section.id;

    const anchorMarkup = renderToStaticMarkup(
      <InspectorPanel {...makeBaseInspectorProps({ document, node: linkNode })} />,
    );

    expect(anchorMarkup).toContain('>Type<');
    expect(anchorMarkup).toContain('>Section<');
    expect(anchorMarkup).toContain('>Internal<');
    expect(anchorMarkup).toContain('>External<');
    expect(anchorMarkup).not.toContain('Open in a new tab');

    linkNode.anchorTargetId = 'missing-section';

    const brokenMarkup = renderToStaticMarkup(
      <InspectorPanel {...makeBaseInspectorProps({ document, node: linkNode })} />,
    );

    expect(brokenMarkup).toContain('Broken anchor');
  });

  it('renders anchor button controls with section choices and a broken-link warning', () => {
    const document = createInitialDocument();
    const section = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'section' && node.name === 'Post Layout',
    );

    if (!section || section.type !== 'wrapper') {
      throw new Error('Expected section node');
    }

    const buttonNode = createLeaf('button', section.id);
    if (buttonNode.type !== 'leaf' || buttonNode.role !== 'button') {
      throw new Error('Expected button node');
    }
    document.nodes[buttonNode.id] = buttonNode;
    section.children.push(buttonNode.id);

    buttonNode.linkType = 'anchor';
    buttonNode.anchorTargetId = section.id;

    const anchorMarkup = renderToStaticMarkup(
      <InspectorPanel {...makeBaseInspectorProps({ document, node: buttonNode })} />,
    );

    expect(anchorMarkup).toContain('>Type<');
    expect(anchorMarkup).toContain('>Section<');
    expect(anchorMarkup).toContain('>Internal<');
    expect(anchorMarkup).toContain('>External<');
    expect(anchorMarkup).not.toContain('Open in a new tab');

    buttonNode.anchorTargetId = 'missing-section';

    const brokenMarkup = renderToStaticMarkup(
      <InspectorPanel {...makeBaseInspectorProps({ document, node: buttonNode })} />,
    );

    expect(brokenMarkup).toContain('Broken anchor');
  });

  it('renders single-unit numeric inline fields without select dropdown chrome', () => {
    const markup = renderToStaticMarkup(
      <NumericUnitInlineField value="2px" units={['px']} onChange={() => {}} />,
    );

    expect(markup).toContain('value-with-unit');
    expect(markup).toContain('>px<');
    expect(markup).not.toContain('data-ui="select-trigger"');
  });

  it('limits layout unit menus to the supported per-axis surface', () => {
    expect(getSizeModeOptions('x')).toEqual({
      scalarUnits: ['px'],
      viewportUnits: [],
      keywords: null,
      selectableModes: ['px'],
    });

    expect(getSizeModeOptions('y')).toEqual({
      scalarUnits: ['px'],
      viewportUnits: [],
      keywords: null,
      selectableModes: ['px'],
    });

    expect(getSizeModeOptions('width')).toEqual({
      scalarUnits: ['px', '%'],
      viewportUnits: [],
      keywords: ['fit-content', 'min-content', 'max-content'],
      selectableModes: ['px', '%', 'fit-content', 'min-content', 'max-content'],
    });

    expect(getSizeModeOptions('height')).toEqual({
      scalarUnits: ['px', '%'],
      viewportUnits: [],
      keywords: ['auto', 'aspect-ratio'],
      selectableModes: ['px', '%', 'auto', 'aspect-ratio'],
    });

    expect(getSizeModeOptions('height', { isSectionHeight: true })).toEqual({
      scalarUnits: ['px', '%'],
      viewportUnits: ['vh', 'vmin', 'vmax'],
      keywords: ['auto', 'aspect-ratio'],
      selectableModes: ['px', '%', 'auto', 'aspect-ratio', 'vh', 'vmin', 'vmax'],
    });
  });

  it('describes numeric, keyword, and aspect-ratio size values for the composite field', () => {
    expect(describeSizeFieldValue('50%', 'width')).toEqual({
      kind: 'numeric',
      mode: '%',
      input: '50',
    });

    expect(describeSizeFieldValue('475.547px', 'width')).toEqual({
      kind: 'numeric',
      mode: 'px',
      input: '475.55',
    });

    expect(describeSizeFieldValue('fit-content', 'width')).toEqual({
      kind: 'keyword',
      mode: 'fit-content',
      input: '',
    });

    expect(describeSizeFieldValue('aspect-ratio(16/9)', 'height')).toEqual({
      kind: 'aspect-ratio',
      mode: 'aspect-ratio',
      input: '16/9',
    });
  });

  it('normalizes composite field output back to stored rect values', () => {
    expect(buildSizeFieldValue('width', 'vw', '33.5')).toBeNull();
    expect(buildSizeFieldValue('width', 'vmin', '12')).toBeNull();
    expect(buildSizeFieldValue('x', 'vmax', '48')).toBeNull();
    expect(buildSizeFieldValue('width', 'fit-content', '')).toBe('fit-content');
    expect(buildSizeFieldValue('height', 'auto', '')).toBe('auto');
    expect(buildSizeFieldValue('height', 'aspect-ratio', '16 / 9')).toBe('aspect-ratio(16/9)');
    expect(buildSizeFieldValue('height', 'aspect-ratio', '1.7778')).toBe('aspect-ratio(1.7778)');
    expect(buildSizeFieldValue('height', 'aspect-ratio', '16/9/2')).toBeNull();
    expect(buildSizeFieldValue('x', 'px', '48')).toBe('48px');
    expect(buildSizeFieldValue('x', 'px', '-48')).toBe('-48px');
    expect(buildSizeFieldValue('x', '%', '48')).toBeNull();
    expect(buildSizeFieldValue('width', 'px', '-1')).toBeNull();
    expect(buildSizeFieldValue('height', 'vh', '50')).toBeNull();
    expect(buildSizeFieldValue('height', 'vh', '50', { isSectionHeight: true })).toBe('50vh');
    expect(buildSizeFieldValue('height', 'vh', '-1', { isSectionHeight: true })).toBeNull();
  });

  it('renders a min=0 bound on width and height numeric size inputs only', () => {
    const widthMarkup = renderToStaticMarkup(
      <SizeInlineField label="W" nodeId="node_1" axis="width" value="120px" onChange={() => {}} />,
    );
    const heightMarkup = renderToStaticMarkup(
      <SizeInlineField label="H" nodeId="node_1" axis="height" value="80px" onChange={() => {}} />,
    );
    const xMarkup = renderToStaticMarkup(
      <SizeInlineField label="X" nodeId="node_1" axis="x" value="-24px" onChange={() => {}} />,
    );

    expect(widthMarkup).toContain('min="0"');
    expect(heightMarkup).toContain('min="0"');
    expect(xMarkup).not.toContain('min="0"');
  });

  it('renders x and y with a fixed px suffix instead of a unit dropdown', () => {
    const markup = renderToStaticMarkup(
      <SizeInlineField label="X" nodeId="node_1" axis="x" value="24px" onChange={() => {}} />,
    );

    expect(markup).toContain('>px<');
    expect(markup).not.toContain('data-ui="select-trigger"');
  });

  it('normalizes aspect-ratio expressions from a single inline text field', () => {
    expect(normalizeAspectRatioExpression('16 / 9')).toBe('16/9');
    expect(normalizeAspectRatioExpression('1.5')).toBe('1.5');
    expect(normalizeAspectRatioExpression('0')).toBeNull();
  });

  it('converts live rendered pixels into target units when switching numeric modes', () => {
    expect(convertRenderedPxToUnitValue(144, 'width', 'vw', undefined, 1440)).toBe(10);
    expect(convertRenderedPxToUnitValue(180, 'height', 'vh', undefined, 900)).toBe(20);
    expect(convertRenderedPxToUnitValue(90, 'width', 'vmin', undefined, 900)).toBe(10);
    expect(convertRenderedPxToUnitValue(120, 'width', 'vmax', undefined, 1200)).toBe(10);
    expect(convertRenderedPxToUnitValue(250, 'width', '%', 1000)).toBe(25);
    expect(convertRenderedPxToUnitValue(48, 'x', '%', 1000)).toBeNull();
    expect(convertRenderedPxToUnitValue(428, 'width', 'vw', undefined, 1600)).toBe(26.75);
  });

  it('converts live rendered font size into target font size units', () => {
    expect(convertRenderedPxToFontSizeValue(32, 'px', { rootFontSizePx: 16, inheritedFontSizePx: 20 })).toBe(32);
    expect(convertRenderedPxToFontSizeValue(32, 'em', { rootFontSizePx: 16, inheritedFontSizePx: 20 })).toBe(1.6);
    expect(convertRenderedPxToFontSizeValue(32, 'rem', { rootFontSizePx: 16, inheritedFontSizePx: 20 })).toBe(2);
  });

  it('uses live rendered geometry when switching from keyword sizing into numeric units', () => {
    const stageShell = {
      getBoundingClientRect: () => ({
        width: 1600,
        height: 1200,
      }),
    };
    const parentRect = {
      width: 900,
      height: 600,
      left: 100,
      top: 50,
      right: 1000,
      bottom: 650,
      x: 100,
      y: 50,
      toJSON() {
        return this;
      },
    } as DOMRect;
    const childRect = {
      width: 475.546875,
      height: 208,
      left: 658,
      top: 320,
      right: 1133.546875,
      bottom: 528,
      x: 658,
      y: 320,
      toJSON() {
        return this;
      },
    } as DOMRect;
    const parent = {
      getBoundingClientRect: () => parentRect,
      closest: () => null,
    };
    const child = {
      getBoundingClientRect: () => childRect,
      parentElement: parent,
    };
    const ownerDocument = {
      getElementById: (id: string) => (id === 'stage-node-text_10' ? child : null),
      querySelector: (selector: string) => (selector === '.stage-shell' ? stageShell : null),
      defaultView: {
        getComputedStyle: () => ({
          paddingLeft: '0px',
          paddingRight: '0px',
          paddingTop: '0px',
          paddingBottom: '0px',
        }),
      },
    } as unknown as Document;

    expect(convertStageMeasurementToInput('text_10', 'width', 'px', ownerDocument)).toBe('475.55');
    expect(convertStageMeasurementToInput('text_10', 'width', 'vw', ownerDocument)).toBe('29.72');
    expect(convertStageMeasurementToInput('text_10', 'width', 'vmin', ownerDocument)).toBe('39.63');
    expect(convertStageMeasurementToInput('text_10', 'width', 'vmax', ownerDocument)).toBe('29.72');
    expect(convertStageMeasurementToInput('text_10', 'height', '%', ownerDocument)).toBe('34.67');
  });

  it('uses live rendered font size when switching font size units', () => {
    const element = {
      parentElement: {},
      querySelector: () => null,
    };
    const ownerDocument = {
      getElementById: (id: string) => (id === 'stage-node-text_10' ? element : null),
      documentElement: {},
      defaultView: {
        getComputedStyle: (target: unknown) => {
          if (target === element) {
            return { fontSize: '32px' };
          }
          if (target === element.parentElement) {
            return { fontSize: '20px' };
          }
          return { fontSize: '16px' };
        },
      },
    } as unknown as Document;

    expect(convertStageFontSizeToInput('text_10', 'px', ownerDocument)).toBe('32');
    expect(convertStageFontSizeToInput('text_10', 'em', ownerDocument)).toBe('1.6');
    expect(convertStageFontSizeToInput('text_10', 'rem', ownerDocument)).toBe('2');
  });

  it('defers height percent conversion when the parent wrapper uses section min-height semantics', () => {
    const stageShell = {
      getBoundingClientRect: () => ({
        width: 1600,
        height: 1200,
      }),
    };
    const parentRect = {
      width: 900,
      height: 600,
      left: 100,
      top: 50,
      right: 1000,
      bottom: 650,
      x: 100,
      y: 50,
      toJSON() {
        return this;
      },
    } as DOMRect;
    const parentWrapper = {
      classList: {
        contains: (value: string) => value === 'role-section',
      },
    };
    const parent = {
      getBoundingClientRect: () => parentRect,
      closest: () => null,
      parentElement: parentWrapper,
    };
    const child = {
      getBoundingClientRect: () => ({
        width: 200,
        height: 120,
        left: 120,
        top: 80,
        right: 320,
        bottom: 200,
        x: 120,
        y: 80,
        toJSON() {
          return this;
        },
      }),
      parentElement: parent,
    };
    const ownerDocument = {
      getElementById: (id: string) => (id === 'stage-node-text_10' ? child : null),
      querySelector: (selector: string) => (selector === '.stage-shell' ? stageShell : null),
      defaultView: {
        getComputedStyle: () => ({
          paddingLeft: '0px',
          paddingRight: '0px',
          paddingTop: '0px',
          paddingBottom: '0px',
        }),
      },
    } as unknown as Document;

    expect(convertStageMeasurementToInput('text_10', 'height', '%', ownerDocument)).toBeNull();
  });

});
