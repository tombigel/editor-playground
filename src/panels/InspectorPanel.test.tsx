import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialDocument } from '../model/defaults';
import { InspectorPanel } from './InspectorPanel';

describe('panels/InspectorPanel', () => {
  it('renders the shared 3-button section type selector with the current type selected', () => {
    const document = createInitialDocument();
    const headerNode = Object.values(document.nodes).find(
      (node) => node.type === 'wrapper' && node.role === 'header',
    );

    if (!headerNode || headerNode.type !== 'wrapper') {
      throw new Error('Expected header wrapper');
    }

    const markup = renderToStaticMarkup(
      <InspectorPanel
        node={headerNode}
        showOrderControls={false}
        canOrderBack={false}
        canOrderForward={false}
        canSendToBack={false}
        canBringToFront={false}
        orderBackShortcut=""
        orderForwardShortcut=""
        sendToBackShortcut=""
        bringToFrontShortcut=""
        canSectionBack={false}
        canSectionForward={false}
        onOrderBack={() => {}}
        onOrderForward={() => {}}
        onSendToBack={() => {}}
        onBringToFront={() => {}}
        onSectionBack={() => {}}
        onSectionForward={() => {}}
        onTextChange={() => {}}
        onWrapperStyleChange={() => {}}
        onRectChange={() => {}}
        onPromote={() => {}}
        onDemote={() => {}}
        onStickyEnabled={() => {}}
        onStickyTarget={() => {}}
        onStickyEdges={() => {}}
        onStickyOffset={() => {}}
        onStickyOffsetTop={() => {}}
        onStickyOffsetBottom={() => {}}
        onStickyDurationMode={() => {}}
        onStickyDuration={() => {}}
        onStickyDurationTop={() => {}}
        onStickyDurationBottom={() => {}}
      />,
    );

    expect(markup).toContain('Section type');
    expect(markup).toContain('Set type to Section');
    expect(markup).toContain('Set type to Header');
    expect(markup).toContain('Set type to Footer');
    expect(markup.match(/aria-pressed="true"/g)?.length).toBe(1);
  });
});
