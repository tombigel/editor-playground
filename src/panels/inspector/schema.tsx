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
  if (node.type === 'site') {
    return 'site';
  }
  if (node.type === 'wrapper') {
    return node.role;
  }
  if (node.role === 'text') {
    return 'text';
  }
  if (node.role === 'button') {
    return 'button';
  }
  if (node.role === 'link') {
    return 'link';
  }
  return 'image';
}

export function resolveInspectorBlocks(context: InspectorSectionContext): ResolvedInspectorBlock[] {
  const definitions = getInspectorConfig(context.node);

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
      render: definition.render ? () => definition.render!(context) : undefined,
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
