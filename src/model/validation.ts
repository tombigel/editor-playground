import type { DocumentModel, DocumentNode, WrapperNode } from './types';

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

  return errors;
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
