import type { DocumentModel, DocumentNode, WrapperNode } from './types';

function isSiteSectionRole(role: WrapperNode['role']) {
  return role === 'section' || role === 'header' || role === 'footer';
}

export function validateDocument(document: DocumentModel): string[] {
  const errors: string[] = [];
  const nodes = Object.values(document.nodes);
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

  for (const node of nodes) {
    if (node.type === 'leaf' && node.children.length > 0) {
      errors.push(`Leaf ${node.id} cannot contain children.`);
    }
    if (node.parentId === null) {
      continue;
    }
    const parent = document.nodes[node.parentId];
    if (!parent) {
      errors.push(`Node ${node.id} has missing parent ${node.parentId}.`);
      continue;
    }
    validateRelationship(parent, node, errors);
  }

  return errors;
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
