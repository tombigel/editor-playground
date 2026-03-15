import { InspectorSummary, NodeBasicsSection } from './CommonSections';
import type { InspectorBlockDefinition, InspectorSectionDefinition } from './types';

export const summaryBlock: InspectorBlockDefinition = {
  id: 'summary',
  bucket: 'summary',
  layout: 'custom',
  align: 'start',
  render: ({ node }) => <InspectorSummary node={node} />,
};

export const basicsSection: InspectorSectionDefinition = {
  id: 'basics',
  render: ({ node, orderState, actions }) =>
    node ? <NodeBasicsSection node={node} orderState={orderState} actions={actions} /> : null,
};

export function createSectionBlock(
  definition: Omit<InspectorBlockDefinition, 'render'> & { sections: readonly InspectorSectionDefinition[] },
) {
  return definition;
}

export function createCustomBlock(definition: InspectorBlockDefinition) {
  return definition;
}
