import type { ButtonLeaf, DocumentModel, DocumentNode, LinkLeaf, NodeId, WrapperNode } from './types';
import type { DocumentPage } from './types/site';
import { getAllPageRoutes, getPageRole } from './pageRoutes';
import { normalizeTopLevelWrapperTargetPageIds } from './topLevelWrapperVisibility';

export type LinkValidationError = {
  nodeId: NodeId;
  nodeName: string;
  nodeRole: 'link' | 'button';
  errorType: 'broken-page-link' | 'broken-anchor-link';
  description: string;
};

export function validateLinks(document: DocumentModel): LinkValidationError[] {
  const errors: LinkValidationError[] = [];
  const pageIds = new Set((document.pages ?? []).map((p) => p.id));

  for (const node of Object.values(document.nodes)) {
    if (node.type !== 'leaf') continue;
    if (node.role !== 'link' && node.role !== 'button') continue;

    const leaf = node as LinkLeaf | ButtonLeaf;

    if (leaf.linkType === 'page') {
      if (!leaf.targetPageId) {
        errors.push({
          nodeId: leaf.id,
          nodeName: leaf.name,
          nodeRole: leaf.role,
          errorType: 'broken-page-link',
          description: 'Link has no target page set.',
        });
      } else if (!pageIds.has(leaf.targetPageId)) {
        errors.push({
          nodeId: leaf.id,
          nodeName: leaf.name,
          nodeRole: leaf.role,
          errorType: 'broken-page-link',
          description: `Target page "${leaf.targetPageId}" no longer exists.`,
        });
      }

      if (leaf.pageAnchorId && !document.nodes[leaf.pageAnchorId]) {
        errors.push({
          nodeId: leaf.id,
          nodeName: leaf.name,
          nodeRole: leaf.role,
          errorType: 'broken-anchor-link',
          description: `Page anchor target "${leaf.pageAnchorId}" does not exist.`,
        });
      }
    }

    if (leaf.linkType === 'anchor' && leaf.anchorTargetId) {
      if (!document.nodes[leaf.anchorTargetId]) {
        errors.push({
          nodeId: leaf.id,
          nodeName: leaf.name,
          nodeRole: leaf.role,
          errorType: 'broken-anchor-link',
          description: `Anchor target "${leaf.anchorTargetId}" does not exist.`,
        });
      }
    }
  }

  return errors;
}

function isSiteSectionRole(role: WrapperNode['role']) {
  return role === 'section' || role === 'header' || role === 'footer';
}

export function validateDocument(document: DocumentModel): string[] {
  const errors: string[] = [];
  const nodes = Object.values(document.nodes);
  const root = document.nodes[document.rootId];
  const reachable = new Set<string>();

  if (!root) {
    errors.push(`Missing root node ${document.rootId}.`);
    return errors;
  }

  if (root.type !== 'site') {
    errors.push(`Root node ${document.rootId} must be a site.`);
  }

  if (root.parentId !== null) {
    errors.push(`Root node ${document.rootId} must not have a parent.`);
  }

  const headers = nodes.filter(
    (node) => node.type === 'wrapper' && node.role === 'header',
  );
  const footers = nodes.filter(
    (node) => node.type === 'wrapper' && node.role === 'footer',
  );

  if (headers.length > 1) {
    errors.push('Only one header is allowed.');
  }
  if (footers.length > 1) {
    errors.push('Only one footer is allowed.');
  }

  collectReachableNodes(document, document.rootId, reachable, new Set(), errors);

  for (const node of nodes) {
    if (node.type === 'leaf' && node.children.length > 0) {
      errors.push(`Leaf ${node.id} cannot contain children.`);
    }

    validateChildReferences(document, node, errors);

    if (node.id !== document.rootId && node.parentId === null) {
      errors.push(`Node ${node.id} has no parent but is not the root.`);
    }

    if (node.parentId === null) {
      continue;
    }
    const parent = document.nodes[node.parentId];
    if (!parent) {
      errors.push(`Node ${node.id} has missing parent ${node.parentId}.`);
      continue;
    }

    if (!parent.children.includes(node.id)) {
      errors.push(`Parent ${parent.id} is missing child ${node.id}.`);
    }

    validateRelationship(parent, node, errors);
  }

  for (const node of nodes) {
    if (!reachable.has(node.id)) {
      errors.push(`Node ${node.id} is unreachable from root ${document.rootId}.`);
    }
  }

  if (document.pages && document.pages.length > 0) {
    const pages: DocumentPage[] = document.pages;
    const pageIds = new Set(pages.map((p) => p.id));
    const homePages = pages.filter((page) => getPageRole(page) === 'home');

    if (homePages.length !== 1) {
      errors.push(`Exactly one home page is required; found ${homePages.length}.`);
    }

    const slugsSeen = new Map<string, string>();
    for (const page of pages) {
      if (page.slug === '') {
        errors.push(`Page ${page.id} slug cannot be empty.`);
      }
      if (slugsSeen.has(page.slug)) {
        errors.push(`Duplicate page slug "${page.slug}" on pages ${slugsSeen.get(page.slug)} and ${page.id}.`);
      } else {
        slugsSeen.set(page.slug, page.id);
      }
    }

    // slugOrAliasMap tracks every claimed slug/alias → pageId so alias conflicts can be detected
    const slugOrAliasMap = new Map<string, string>(slugsSeen);
    for (const page of pages) {
      if (!page.slugAliases?.length) continue;
      for (const alias of page.slugAliases) {
        const existing = slugOrAliasMap.get(alias);
        if (existing !== undefined) {
          if (existing === page.id) {
            errors.push(`Page ${page.id} alias "${alias}" duplicates its own slug.`);
          } else {
            errors.push(`Alias "${alias}" on page ${page.id} conflicts with page ${existing}.`);
          }
        } else {
          slugOrAliasMap.set(alias, page.id);
        }
      }
    }

    const routeOwners = new Map<string, string>();
    for (const route of getAllPageRoutes(document)) {
      const existing = routeOwners.get(route.url);
      if (existing && existing !== route.pageId) {
        errors.push(`Route "${route.url}" conflicts between pages ${existing} and ${route.pageId}.`);
      } else {
        routeOwners.set(route.url, route.pageId);
      }
    }

    validatePageParentCycles(pages, errors);

    const sectionIdsSeen = new Map<string, string>();
    for (const page of pages) {
      for (const sectionId of page.sectionIds) {
        const node = document.nodes[sectionId];
        if (!node) {
          errors.push(`Page ${page.id} references missing section node ${sectionId}.`);
        } else if (node.type !== 'wrapper' || node.parentId !== document.rootId || node.role !== 'section') {
          errors.push(`Page ${page.id} section ${sectionId} must be a top-level wrapper with role "section".`);
        }
        if (sectionIdsSeen.has(sectionId)) {
          errors.push(`Section ${sectionId} appears in more than one page (${sectionIdsSeen.get(sectionId)} and ${page.id}).`);
        } else {
          sectionIdsSeen.set(sectionId, page.id);
        }
      }
    }

    const sharedRegionIdsSeen = new Set<string>();
    if (document.sharedRegionIds) {
      for (const regionId of document.sharedRegionIds) {
        const node = document.nodes[regionId];
        if (!node) {
          errors.push(`sharedRegionIds references missing node ${regionId}.`);
        } else if (node.type !== 'wrapper' || node.parentId !== document.rootId) {
          errors.push(`sharedRegionIds node ${regionId} must be a top-level wrapper.`);
        }
        if (sectionIdsSeen.has(regionId)) {
          errors.push(`sharedRegionIds node ${regionId} cannot also belong to page ${sectionIdsSeen.get(regionId)}.`);
        }
        if (sharedRegionIdsSeen.has(regionId)) {
          errors.push(`sharedRegionIds node ${regionId} appears more than once.`);
        } else {
          sharedRegionIdsSeen.add(regionId);
        }
      }
    }

    for (const node of nodes) {
      if (node.type !== 'wrapper' || !isSiteSectionRole(node.role) || node.parentId !== document.rootId) {
        continue;
      }

      const targetPageIds = normalizeTopLevelWrapperTargetPageIds(document, node.pageTargetIds);
      if (node.pageTargetIds?.length && targetPageIds.length !== node.pageTargetIds.length) {
        errors.push(`Top-level wrapper ${node.id} references missing pageTargetIds.`);
      }

      if (!node.visible) {
        continue;
      }

      const isCurrentPageTarget = sectionIdsSeen.has(node.id);
      const isSharedTarget = sharedRegionIdsSeen.has(node.id) || document.sharedRegionIds?.includes(node.id);
      const isCustomTarget = targetPageIds.length > 0;

      if (isCustomTarget && (isCurrentPageTarget || isSharedTarget)) {
        errors.push(`Top-level wrapper ${node.id} cannot be both custom-targeted and shared/current-page.`);
      } else if (!isCustomTarget && !isCurrentPageTarget && !isSharedTarget) {
        errors.push(`Top-level wrapper ${node.id} must belong to a page, shared region, or custom page targets.`);
      }
    }

    for (const page of pages) {
      if (page.parentPageId !== undefined && !pageIds.has(page.parentPageId)) {
        errors.push(`Page ${page.id} references missing parentPageId ${page.parentPageId}.`);
      }
    }
  }

  return errors;
}

function validatePageParentCycles(pages: DocumentPage[], errors: string[]): void {
  const pageMap = new Map(pages.map((p) => [p.id, p]));
  const reportedCycles = new Set<string>();

  for (const page of pages) {
    const visited = new Set<string>();
    let current: DocumentPage | undefined = page;

    while (current?.parentPageId) {
      if (visited.has(current.id)) {
        if (!reportedCycles.has(current.id)) {
          reportedCycles.add(current.id);
          errors.push(`Page parent cycle detected involving page ${current.id}.`);
        }
        break;
      }
      visited.add(current.id);
      current = pageMap.get(current.parentPageId);
    }
  }
}

function collectReachableNodes(
  document: DocumentModel,
  nodeId: string,
  reachable: Set<string>,
  stack: Set<string>,
  errors: string[],
) {
  if (stack.has(nodeId)) {
    errors.push(`Cycle detected at node ${nodeId}.`);
    return;
  }

  const node = document.nodes[nodeId];
  if (!node) {
    return;
  }

  if (reachable.has(nodeId)) {
    return;
  }

  reachable.add(nodeId);
  stack.add(nodeId);

  for (const childId of node.children) {
    collectReachableNodes(document, childId, reachable, stack, errors);
  }

  stack.delete(nodeId);
}

function validateChildReferences(
  document: DocumentModel,
  node: DocumentNode,
  errors: string[],
) {
  const seenChildren = new Set<string>();

  for (const childId of node.children) {
    if (seenChildren.has(childId)) {
      errors.push(`Node ${node.id} references child ${childId} more than once.`);
      continue;
    }

    seenChildren.add(childId);

    const child = document.nodes[childId];
    if (!child) {
      errors.push(`Node ${node.id} references missing child ${childId}.`);
      continue;
    }

    if (child.parentId !== node.id) {
      errors.push(`Child ${childId} does not point back to parent ${node.id}.`);
    }
  }
}

function validateRelationship(
  parent: DocumentNode,
  child: DocumentNode,
  errors: string[],
) {
  if (parent.type === 'leaf') {
    errors.push(`Leaf ${parent.id} cannot contain ${child.id}.`);
    return;
  }
  if (parent.type === 'site') {
    if (child.type !== 'wrapper') {
      errors.push(`Site can only contain wrappers, found ${child.id}.`);
      return;
    }
    if (child.role === 'container') {
      errors.push(`Site cannot directly contain container ${child.id}.`);
    }
    return;
  }
  if (parent.type !== 'wrapper' || child.type !== 'wrapper') {
    return;
  }
  if (isSiteSectionRole(parent.role) && isSiteSectionRole(child.role)) {
    errors.push(`${parent.role} ${parent.id} cannot contain ${child.role} ${child.id}.`);
  }
  if (parent.role === 'container' && child.role !== 'container') {
    errors.push(`Container ${parent.id} cannot contain site section ${child.id}.`);
  }
}
