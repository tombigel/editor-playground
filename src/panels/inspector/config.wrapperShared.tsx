import { Group } from 'lucide-react';
import { AnimationSection } from './AnimationSection';
import { createFocusedModeEntry, InspectorSectionCard, WrapperDesignSection } from './CommonSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, summaryBlock } from './config.common';
import type { InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition, WrapperInspectorNode } from './types';
import { FormField } from '../InspectorControls';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectOptionRow,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SEMANTIC_CONTAINER_OPTIONS = [
  { value: 'container', label: 'Container', description: 'Generic layout wrapper with no landmark meaning.' },
  { value: 'nav', label: 'Nav', description: 'Navigation landmark for primary or local menus.' },
  { value: 'aside', label: 'Aside', description: 'Complementary content related to the surrounding section.' },
  { value: 'article', label: 'Article', description: 'Standalone content that can make sense on its own.' },
] as const;

const wrapperContentSection: InspectorSectionDefinition = {
  id: 'wrapper-content',
  render: ({ node, actions, focusedMode }) =>
    isWrapperNode(node) ? (
      <InspectorSectionCard
        title="Content"
        focusedModeEntry={createFocusedModeEntry(focusedMode, 'content', actions.onEnterFocusedMode)}
      >
        {node.subtype === 'group' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-full justify-center text-[11px]"
            onClick={() => actions.onConvertGroupToContainer(node.id)}
          >
            <Group className="h-3.5 w-3.5" />
            Make container
          </Button>
        ) : node.subtype === 'container' || node.subtype === 'nav' || node.subtype === 'aside' || node.subtype === 'article' ? (
          <div className="space-y-2.5">
            <FormField label="Semantic type">
              <Select
                value={node.subtype}
                onValueChange={(value) =>
                  actions.onContainerSemanticTypeChange(
                    node.id,
                    value as (typeof SEMANTIC_CONTAINER_OPTIONS)[number]['value'],
                  )
                }
              >
                <SelectTrigger className="h-7 text-[11px]">
                  <SelectValue>
                    {SEMANTIC_CONTAINER_OPTIONS.find((option) => option.value === node.subtype)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-56">
                  {SEMANTIC_CONTAINER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} textValue={option.label}>
                      <SelectOptionRow
                        label={option.label}
                        description={option.description}
                        descriptionClassName="text-[10px]"
                      />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Accessible name">
              <Input
                value={node.ariaLabel ?? ''}
                placeholder="Accessible name"
                onChange={(event) => actions.onContainerAriaLabelChange(node.id, event.currentTarget.value)}
              />
            </FormField>
          </div>
        ) : null}
      </InspectorSectionCard>
    ) : null,
};

const wrapperDesignSection: InspectorSectionDefinition = {
  id: 'wrapper-design',
  render: ({ node, actions, focusedMode }) =>
    isWrapperNode(node) ? (
      <WrapperDesignSection
        node={node}
        onWrapperStyleChange={actions.onWrapperStyleChange}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

const wrapperStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions, focusedMode, globalStickyElevation }) =>
    isWrapperNode(node) ? <StickySection node={node} actions={actions} focusedMode={focusedMode} globalStickyElevation={globalStickyElevation} /> : null,
};

const wrapperAnimationSection: InspectorSectionDefinition = {
  id: 'animation',
  render: ({ node, actions, focusedMode }) =>
    isWrapperNode(node) ? <AnimationSection node={node} actions={actions} focusedMode={focusedMode} /> : null,
};

export function createWrapperInspectorConfig(
  title = 'Sticky behavior',
  options: { includeContent?: boolean } = {},
): readonly InspectorBlockDefinition[] {
  const contentBlock = options.includeContent
    ? [
      createSectionBlock({
        id: 'content',
        bucket: 'primary',
        title: 'Content',
        description: 'Semantic wrapper role and accessible label.',
        sections: [wrapperContentSection],
      }),
    ]
    : [];

  return [
    summaryBlock,
    createSectionBlock({
      id: 'layout',
      bucket: 'primary',
      title: 'Layout',
      description: 'Position, sizing, and wrapper actions.',
      sections: [basicsSection],
    }),
    ...contentBlock,
    createSectionBlock({
      id: 'sticky-behavior',
      bucket: 'behavior',
      title,
      description: 'Target, offsets, and duration behavior.',
      sections: [wrapperStickySection],
    }),
    createSectionBlock({
      id: 'animation-behavior',
      bucket: 'behavior',
      title: 'Animation',
      description: 'Motion effects and trigger configuration.',
      sections: [wrapperAnimationSection],
    }),
    createSectionBlock({
      id: 'design',
      bucket: 'primary',
      title: 'Design',
      description: 'Wrapper visual styling.',
      when: ({ node }) => !isWrapperNode(node) || node.subtype !== 'group',
      sections: [wrapperDesignSection],
    }),
  ];
}

function isWrapperNode(node: InspectorNode | null): node is WrapperInspectorNode {
  return Boolean(node && node.contentType === 'container');
}
