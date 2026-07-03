import { flattenTextContent } from '../api/textConversion';
import type { DocumentModel, DocumentNode, NodeId } from '../model/types';
import type { EditorState } from '../editor/types/index';

export type AiDraftControlAction = 'approve' | 'reject';

export type AiHistoryControlAction = 'undo' | 'redo';

export type AiHelpTarget = 'aiGuide' | 'gettingStarted' | 'shortcuts' | 'aiApi' | 'api';

export type AiRequestRoute =
  | { kind: 'draftControl'; action: AiDraftControlAction }
  | { kind: 'historyControl'; action: AiHistoryControlAction }
  | { kind: 'helpRequest'; target: AiHelpTarget }
  | { kind: 'directOperation'; commandWords: string[]; targetHints: string[] }
  | { kind: 'normalChat' };

export type ClassifyAiRequestOptions = {
  hasPendingDraft: boolean;
};

const DIRECT_COMMAND_WORDS = [
  'move',
  'nudge',
  'shift',
  'delete',
  'remove',
  'hide',
  'show',
  'rename',
  'resize',
  'set',
  'change',
] as const;

const TARGET_HINT_WORDS = [
  'selection',
  'selected',
  'this',
  'it',
  'image',
  'text',
  'block',
  'section',
  'container',
] as const;

const MAX_DRAFT_CONTROL_TOKENS = 4; // draft controls only match short, bare confirmations

const APPROVE_PHRASES = [
  'approve',
  'apply',
  'do it',
  'make the change',
  'make changes',
  'looks good',
  'yes',
  'yep',
  'ok',
  'okay',
] as const;

const REJECT_PHRASES = ['reject', 'cancel', 'dismiss', 'no', 'nope', 'stop'] as const;

const UNDO_PHRASES = [
  'undo',
  'revert',
  'go back',
  'roll back',
  'rollback',
  'cancel last change',
  'cancel the last change',
  'cancel previous change',
  'cancel the previous change',
] as const;

const REDO_PHRASES = [
  'redo',
  'reapply',
  'undo the undo',
  'undo last undo',
  'undo the last undo',
  'revert the undo',
  'cancel the undo',
] as const;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value).split(' ').filter(Boolean);
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) {
    return true;
  }
  if (Math.abs(a.length - b.length) > 1) {
    return false;
  }

  let mismatches = 0;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    mismatches += 1;
    if (mismatches > 1) {
      return false;
    }
    if (a.length > b.length) {
      i += 1;
    } else if (b.length > a.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }
  return true;
}

function tokenMatchesWord(token: string, word: string): boolean {
  return token === word || (word.length >= 4 && token.length >= 4 && editDistanceAtMostOne(token, word));
}

function findMatchedWords(tokens: string[], words: readonly string[]): string[] {
  return words.filter((word) => tokens.some((token) => tokenMatchesWord(token, word)));
}

function includesPhrase(normalized: string, phrase: string): boolean {
  return new RegExp(`(?:^| )${phrase.replace(/\s+/g, ' ')}(?: |$)`).test(normalized);
}

function classifyHelpTarget(normalized: string, tokens: string[]): AiHelpTarget {
  if (normalized === 'help' || normalized.includes('what can you do')) {
    return 'aiGuide';
  }
  if (tokens.some((token) => tokenMatchesWord(token, 'shortcut') || tokenMatchesWord(token, 'shortcuts'))) {
    return 'shortcuts';
  }
  if (
    tokens.some((token) => tokenMatchesWord(token, 'api')) &&
    tokens.some((token) => tokenMatchesWord(token, 'ai') || tokenMatchesWord(token, 'tool') || tokenMatchesWord(token, 'tools'))
  ) {
    return 'aiApi';
  }
  if (
    tokens.some((token) => tokenMatchesWord(token, 'ai') || tokenMatchesWord(token, 'tool') || tokenMatchesWord(token, 'tools')) ||
    normalized.includes('prompt')
  ) {
    return 'aiGuide';
  }
  if (tokens.some((token) => tokenMatchesWord(token, 'api') || tokenMatchesWord(token, 'docs'))) {
    return 'api';
  }
  return 'gettingStarted';
}

function isHelpRequest(normalized: string, tokens: string[]): boolean {
  if (tokens.some((token) => tokenMatchesWord(token, 'help') || tokenMatchesWord(token, 'docs') || tokenMatchesWord(token, 'documentation'))) {
    return true;
  }
  if (normalized.startsWith('how ') || normalized.startsWith('how do ') || normalized.startsWith('how can ')) {
    return true;
  }
  if (normalized.includes('what can you do') || normalized.includes('show shortcuts')) {
    return true;
  }
  return false;
}

function classifyDraftControl(normalized: string): AiDraftControlAction | null {
  if (APPROVE_PHRASES.some((phrase) => includesPhrase(normalized, phrase))) {
    return 'approve';
  }
  if (REJECT_PHRASES.some((phrase) => includesPhrase(normalized, phrase))) {
    return 'reject';
  }
  return null;
}

function classifyHistoryControl(normalized: string): AiHistoryControlAction | null {
  if (REDO_PHRASES.some((phrase) => includesPhrase(normalized, phrase))) {
    return 'redo';
  }
  if (UNDO_PHRASES.some((phrase) => includesPhrase(normalized, phrase))) {
    return 'undo';
  }
  return null;
}

export function classifyAiRequest(text: string, options: ClassifyAiRequestOptions): AiRequestRoute {
  const normalized = normalizeText(text);
  const tokens = tokenize(text);

  if (!normalized) {
    return { kind: 'normalChat' };
  }

  if (isHelpRequest(normalized, tokens)) {
    return { kind: 'helpRequest', target: classifyHelpTarget(normalized, tokens) };
  }

  const historyAction = classifyHistoryControl(normalized);
  if (historyAction) {
    return { kind: 'historyControl', action: historyAction };
  }

  if (options.hasPendingDraft && tokens.length <= MAX_DRAFT_CONTROL_TOKENS) {
    const draftAction = classifyDraftControl(normalized);
    if (draftAction) {
      return { kind: 'draftControl', action: draftAction };
    }
  } else if (tokens.length <= MAX_DRAFT_CONTROL_TOKENS && classifyDraftControl(normalized)) {
    return { kind: 'normalChat' };
  }

  const commandWords = findMatchedWords(tokens, DIRECT_COMMAND_WORDS);
  if (commandWords.length > 0) {
    return {
      kind: 'directOperation',
      commandWords,
      targetHints: findMatchedWords(tokens, TARGET_HINT_WORDS),
    };
  }

  return { kind: 'normalChat' };
}

function nodeSubtype(node: DocumentNode): string | null {
  return 'subtype' in node ? node.subtype : null;
}

function nodeRectSummary(node: DocumentNode): Record<string, string> | null {
  if (node.contentType === 'site') {
    return null;
  }
  return {
    x: node.rect.x.base.raw,
    y: node.rect.y.base.raw,
    width: node.rect.width.base.raw,
    height: node.rect.height.base.raw,
  };
}

function textPreview(node: DocumentNode): string | null {
  if (node.contentType !== 'text') {
    return null;
  }
  const flattened = flattenTextContent(node.content).replace(/\s+/g, ' ').trim();
  return flattened.length > 120 ? `${flattened.slice(0, 117)}...` : flattened || null;
}

function summarizeNode(node: DocumentNode) {
  return {
    id: node.id,
    name: node.name,
    contentType: node.contentType,
    subtype: nodeSubtype(node),
    parentId: node.parentId,
    visible: node.visible,
    locked: node.locked,
    children: node.children,
    rect: nodeRectSummary(node),
    textPreview: textPreview(node),
  };
}

export function buildDirectOperationContextMessage(
  document: DocumentModel,
  editorState: EditorState,
  route: Extract<AiRequestRoute, { kind: 'directOperation' }>,
): string {
  const selectedIds = editorState.selectedIds.length > 0 ? editorState.selectedIds : editorState.selectedId ? [editorState.selectedId] : [];
  const selectedNodes = selectedIds
    .map((nodeId: NodeId) => document.nodes[nodeId])
    .filter((node): node is DocumentNode => node != null)
    .slice(0, 8)
    .map(summarizeNode);

  return [
    'The user appears to be requesting a direct editor operation.',
    '',
    'Current editor context:',
    JSON.stringify(
      {
        selection: {
          selectedId: editorState.selectedId,
          selectedIds,
        },
        selectedNodes,
        detectedCommandWords: route.commandWords,
        detectedTargetHints: route.targetHints,
      },
      null,
      2,
    ),
    '',
    'Instruction:',
    '- If the request can be satisfied with the available tools and the target/value is clear, call the appropriate mutation tool now. Mutation tools create drafts only.',
    '- Do not ask for permission before drafting the change.',
    '- For movement or resizing, compute the proposed rect value from the current rect when enough numeric information is present.',
    '- If the target, action, or value is genuinely ambiguous or fuzzy, ask one concise clarification question instead of guessing.',
  ].join('\n');
}
