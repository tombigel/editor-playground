import { summaryBlock } from './config.common';
import { BUTTON_INSPECTOR_CONFIG } from './config.button';
import { CONTAINER_INSPECTOR_CONFIG } from './config.container';
import { FOOTER_INSPECTOR_CONFIG } from './config.footer';
import { HEADER_INSPECTOR_CONFIG } from './config.header';
import { IMAGE_INSPECTOR_CONFIG } from './config.image';
import { LINK_INSPECTOR_CONFIG } from './config.link';
import { SECTION_INSPECTOR_CONFIG } from './config.section';
import { SITE_INSPECTOR_CONFIG } from './config.site';
import { TEXT_INSPECTOR_CONFIG } from './config.text';
import { DebugInfoSection } from './DebugInfoSection';
import { isContainerNode, isTextNode, isMediaNode } from '../../model/types';
import type {
  InspectorBlockDefinition,
  InspectorNode,
  InspectorSectionContext,
  ResolvedInspectorBlock,
} from './types';

export type InspectorConfigKey =
  | 'empty'
  | 'site'
  | 'section'
  | 'container'
  | 'header'
  | 'footer'
  | 'text'
  | 'button'
  | 'link'
  | 'image';

const EMPTY_INSPECTOR_CONFIG: readonly InspectorBlockDefinition[] = [summaryBlock];

export function resolveInspectorConfigKey(node: InspectorNode | null): InspectorConfigKey {
  if (!node) {
    return 'empty';
  }
  if (node.contentType === 'site') {
    return 'site';
  }
  if (isContainerNode(node)) {
    return node.subtype as InspectorConfigKey;
  }
  if (isTextNode(node)) {
    if (node.link !== undefined && node.style?.background !== undefined) {
      return 'button';
    }
    return 'text';
  }
  if (isMediaNode(node)) {
    return 'image';
  }
  return 'text';
}

function getInspectorDefinitions(
  context: InspectorSectionContext,
): readonly InspectorBlockDefinition[] {
  const definitions = getInspectorConfig(context.node);

  if (!context.showDebugInfo || !context.node || context.node.contentType === 'site' || !context.debugInfo) {
    return definitions;
  }

  return [
    {
      id: 'debug-info',
      bucket: 'primary' as const,
      layout: 'custom' as const,
      render: (_ctx: InspectorSectionContext) => (
        <DebugInfoSection items={context.debugInfo ? [context.debugInfo] : []} />
      ),
    },
    ...definitions,
  ];
}

export function resolveInspectorBlocks(context: InspectorSectionContext): ResolvedInspectorBlock[] {
  const definitions = getInspectorDefinitions(context);

  return definitions
    .filter((definition) => definition.when?.(context) ?? true)
    .map((definition) => ({
      id: definition.id,
      bucket: definition.bucket,
      title: definition.title,
      description: definition.description,
      align: definition.align ?? 'stretch',
      layout: definition.render ? 'custom' : definition.layout ?? 'stack',
      sections:
        definition.sections
          ?.filter((section) => section.when?.(context) ?? true)
          .map((section) => ({
            id: section.id,
            render: () => section.render(context),
          })) ?? [],
      render: definition.render ? () => definition.render?.(context) : undefined,
    }));
}

function getInspectorConfig(node: InspectorNode | null): readonly InspectorBlockDefinition[] {
  switch (resolveInspectorConfigKey(node)) {
    case 'empty':
      return EMPTY_INSPECTOR_CONFIG;
    case 'site':
      return SITE_INSPECTOR_CONFIG;
    case 'section':
      return SECTION_INSPECTOR_CONFIG;
    case 'container':
      return CONTAINER_INSPECTOR_CONFIG;
    case 'header':
      return HEADER_INSPECTOR_CONFIG;
    case 'footer':
      return FOOTER_INSPECTOR_CONFIG;
    case 'text':
      return TEXT_INSPECTOR_CONFIG;
    case 'button':
      return BUTTON_INSPECTOR_CONFIG;
    case 'link':
      return LINK_INSPECTOR_CONFIG;
    case 'image':
      return IMAGE_INSPECTOR_CONFIG;
    default:
      return EMPTY_INSPECTOR_CONFIG;
  }
}
