import { InspectorSummary, NodeBasicsSection } from './CommonSections';
import type { InspectorBlockDefinition, InspectorSectionDefinition } from './types';

export const summaryBlock: InspectorBlockDefinition = {
  id: 'summary',
  bucket: 'summary',
  layout: 'custom',
  align: 'start',
  when: ({ node }) => !node || node.type === 'site',
  render: ({ node, actions }) => <InspectorSummary node={node} actions={actions} />,
};

export const basicsSection: InspectorSectionDefinition = {
  id: 'basics',
  render: ({ document, activePageId, node, orderState, actions, focusedMode }) =>
    node ? (
      <NodeBasicsSection
        document={document}
        activePageId={activePageId}
        node={node}
        orderState={orderState}
        actions={actions}
        focusedMode={focusedMode}
      />
    ) : null,
};

export function createSectionBlock(
  definition: Omit<InspectorBlockDefinition, 'render'> & { sections: readonly InspectorSectionDefinition[] },
) {
  return definition;
}

export function createCustomBlock(definition: InspectorBlockDefinition) {
  return definition;
}
