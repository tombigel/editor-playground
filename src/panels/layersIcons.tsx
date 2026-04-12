import type { LucideIcon } from 'lucide-react';
import type { DocumentNode } from '../api/documentViewApi';
import { getNodeIcon } from '../render/nodeIcons';

export function getLayersNodeIcon(node: Exclude<DocumentNode, { contentType: 'site' }>): LucideIcon {
  return getNodeIcon(node);
}
