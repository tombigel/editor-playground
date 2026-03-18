import { InspectorSummary, NodeBasicsSection } from './CommonSections';
import type { InspectorBlockDefinition, InspectorSectionDefinition } from './types';

export const summaryBlock: InspectorBlockDefinition = {
  id: 'summary',
  bucket: 'summary',
  layout: 'custom',
  align: 'start',
  render: ({ document, node, actions }) => <InspectorSummary document={document} node={node} actions={actions} />,
};

export const basicsSection: InspectorSectionDefinition = {
  id: 'basics',
  render: ({ node, orderState, actions, focusedMode }) =>
    node ? <NodeBasicsSection node={node} orderState={orderState} actions={actions} focusedMode={focusedMode} /> : null,
};

export function createSectionBlock(
  definition: Omit<InspectorBlockDefinition, 'render'> & { sections: readonly InspectorSectionDefinition[] },
) {
  return definition;
}

export function createCustomBlock(definition: InspectorBlockDefinition) {
  return definition;
}
