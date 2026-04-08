import { useState } from 'react';
import { TextAppearanceSection, TextContentSection, RichTextContentSection, CodeContentSection, TextDesignSection, TextTextStyleSection, CodeTextStyleSection, CodeDesignSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, summaryBlock } from './config.common';
import { normalizeRichContent } from '../../model/richContent';
import { isTextNode as isTextNodeGuard } from '../../model/types';
import type { TextSubtype } from '../../model/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { InspectorActionHandlers, InspectorBlockDefinition, InspectorNode, InspectorSectionDefinition, TextInspectorNode } from './types';
import { ListContentSection } from './contentSections/textSections';

const textDesignSection: InspectorSectionDefinition = {
  id: 'text-design',
  render: ({ node, actions, focusedMode }) => {
    if (!isAnyTextNode(node)) return null;
    if (node.subtype === 'code') {
      return (
        <CodeDesignSection
          node={node}
          onTextChange={actions.onTextChange}
          focusedMode={focusedMode}
          onEnterFocusedMode={actions.onEnterFocusedMode}
        />
      );
    }
    return (
      <TextDesignSection
        node={node}
        onTextChange={actions.onTextChange}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    );
  },
};

const textTextStyleSection: InspectorSectionDefinition = {
  id: 'text-text-style',
  render: ({ document, node, actions, focusedMode }) => {
    if (!isNonRichTextNode(node)) return null;
    if (node.subtype === 'code') {
      return (
        <CodeTextStyleSection
          node={node}
          onTextChange={actions.onTextChange}
          focusedMode={focusedMode}
          onEnterFocusedMode={actions.onEnterFocusedMode}
        />
      );
    }
    if (node.subtype === 'list') {
      return (
        <TextTextStyleSection
          document={document}
          node={node}
          onTextChange={actions.onTextChange}
          onOpenManageFonts={actions.onOpenManageFonts ?? (() => undefined)}
          showHtmlTag={false}
          focusedMode={focusedMode}
          onEnterFocusedMode={actions.onEnterFocusedMode}
        />
      );
    }
    return (
      <TextTextStyleSection
        document={document}
        node={node}
        onTextChange={actions.onTextChange}
        onOpenManageFonts={actions.onOpenManageFonts ?? (() => undefined)}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    );
  },
};

export const textAppearanceSection: InspectorSectionDefinition = {
  id: 'text-appearance',
  render: ({ document, node, actions, focusedMode }) =>
    isNonRichTextNode(node) ? (
      <TextAppearanceSection
        document={document}
        node={node}
        onTextChange={actions.onTextChange}
        onOpenManageFonts={actions.onOpenManageFonts ?? (() => undefined)}
        focusedMode={focusedMode}
        onEnterFocusedMode={actions.onEnterFocusedMode}
      />
    ) : null,
};

const TEXT_SUBTYPES: { value: TextSubtype; label: string }[] = [
  { value: 'block', label: 'Text' },
  { value: 'rich', label: 'Rich' },
  { value: 'code', label: 'Code' },
  { value: 'list', label: 'List' },
];

function SubtypeSwitcher({ node, actions }: { node: InspectorNode | null; actions: InspectorActionHandlers }) {
  const [pendingSubtype, setPendingSubtype] = useState<TextSubtype | null>(null);
  if (!node || !isTextNodeGuard(node)) return null;
  const textNode = node;
  const current = textNode.subtype as TextSubtype;
  const richBlockCount = textNode.subtype === 'rich' ? normalizeRichContent(textNode.content).length : 0;

  function commitSwitch(nextSubtype: TextSubtype, conversionMode?: 'flatten' | 'split') {
    actions.onSwitchTextSubtype(textNode.id, nextSubtype, conversionMode);
    setPendingSubtype(null);
  }

  function handleSubtypeClick(nextSubtype: TextSubtype) {
    if (nextSubtype === current) {
      return;
    }

    if (textNode.subtype === 'rich' && nextSubtype !== 'rich' && richBlockCount > 1) {
      setPendingSubtype(nextSubtype);
      return;
    }

    commitSwitch(nextSubtype);
  }

  return (
    <>
      <div className="editor-bg-subtle editor-border-subtle inline-flex rounded-lg border p-0.5">
        {TEXT_SUBTYPES.map(({ value, label }) => (
          <Button
            key={value}
            type="button"
            variant={current === value ? 'default' : 'ghost'}
            size="sm"
            className="h-6 rounded-md px-2 text-[11px]"
            onClick={() => handleSubtypeClick(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {pendingSubtype ? (
        <Dialog open onOpenChange={(open) => !open && setPendingSubtype(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Convert rich text?</DialogTitle>
              <DialogDescription>
                This rich text node has {richBlockCount} blocks. Flatten keeps one node and removes unsupported
                structure. Split uses the headless conversion API to turn each block into a sibling text node.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPendingSubtype(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => commitSwitch(pendingSubtype, 'flatten')}
              >
                Flatten
              </Button>
              <Button
                type="button"
                onClick={() => commitSwitch(pendingSubtype, 'split')}
              >
                Split into nodes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

const textContentSection: InspectorSectionDefinition = {
  id: 'text-content',
  render: ({ document, node, actions, focusedMode }) => {
    if (!node || !isTextNodeGuard(node)) return null;
    const switcher = <SubtypeSwitcher node={node} actions={actions} />;
    if (node.subtype === 'block') {
      return (
        <TextContentSection
          document={document}
          node={node}
          onTextChange={actions.onTextChange}
          focusedMode={focusedMode}
          onEnterFocusedMode={actions.onEnterFocusedMode}
          headerContent={switcher}
        />
      );
    }
    if (node.subtype === 'rich') {
      return (
        <RichTextContentSection
          node={node}
          focusedMode={focusedMode}
          onEnterFocusedMode={actions.onEnterFocusedMode}
          onActivateRichEdit={actions.onActivateRichEdit}
          headerContent={switcher}
        />
      );
    }
    if (node.subtype === 'code') {
      return (
        <CodeContentSection
          node={node}
          onTextChange={actions.onTextChange}
          focusedMode={focusedMode}
          onEnterFocusedMode={actions.onEnterFocusedMode}
          headerContent={switcher}
        />
      );
    }
    if (node.subtype === 'list') {
      return (
        <ListContentSection
          node={node}
          onSetListContent={(content) => actions.onSetListContent?.(node.id, content)}
          focusedMode={focusedMode}
          onEnterFocusedMode={actions.onEnterFocusedMode}
          headerContent={switcher}
        />
      );
    }
    return null;
  },
};

const textStickySection: InspectorSectionDefinition = {
  id: 'sticky',
  render: ({ node, actions, focusedMode, globalStickyElevation }) =>
    isAnyTextNode(node) ? <StickySection node={node} actions={actions} focusedMode={focusedMode} globalStickyElevation={globalStickyElevation} /> : null,
};

export const TEXT_INSPECTOR_CONFIG: readonly InspectorBlockDefinition[] = [
  summaryBlock,
  createSectionBlock({
    id: 'layout',
    bucket: 'primary',
    title: 'Layout',
    description: 'Position, sizing, and ordering.',
    sections: [basicsSection],
  }),
  createSectionBlock({
    id: 'sticky-behavior',
    bucket: 'behavior',
    title: 'Sticky behavior',
    description: 'Target, offsets, and duration behavior.',
    sections: [textStickySection],
  }),
  createSectionBlock({
    id: 'content',
    bucket: 'primary',
    title: 'Content',
    description: 'Copy fields for text nodes.',
    sections: [textContentSection],
  }),
  createSectionBlock({
    id: 'text-style',
    bucket: 'primary',
    title: 'Text style',
    description: 'Typography and semantic text controls.',
    sections: [textTextStyleSection],
  }),
  createSectionBlock({
    id: 'design',
    bucket: 'primary',
    title: 'Design',
    description: 'Color and shadow treatment.',
    sections: [textDesignSection],
  }),
];

// All standalone text subtypes — used for sticky and design panels
function isAnyTextNode(node: InspectorNode | null): node is TextInspectorNode {
  return Boolean(node && isTextNodeGuard(node) && node.link === undefined);
}

// Non-rich standalone subtypes — used for shared text style and appearance panels
function isNonRichTextNode(node: InspectorNode | null): node is TextInspectorNode {
  return Boolean(node && isTextNodeGuard(node) && node.subtype !== 'rich' && node.link === undefined);
}
