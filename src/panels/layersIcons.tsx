import type { LucideIcon } from 'lucide-react';
import type { DocumentNode } from '../model/types';
import { getNodeIcon } from '../render/nodeIcons';

export function getLayersNodeIcon(node: Exclude<DocumentNode, { contentType: 'site' }>): LucideIcon {
  return getNodeIcon(node);
}
