import { useState } from 'react';
import {
  CodeXml,
  ListOrdered,
  PencilLine,
  TextInitial,
  type LucideIcon,
} from 'lucide-react';
import { AnimationSection } from './AnimationSection';
import { TextAppearanceSection, TextContentSection, RichTextContentSection, CodeContentSection, TextDesignSection, TextTextStyleSection, CodeTextStyleSection, CodeDesignSection } from './ContentSections';
import { StickySection } from './StickySection';
import { basicsSection, createSectionBlock, summaryBlock } from './config.common';
import { getTextDocumentBlocks, isTextNode as isTextNodeGuard } from '../../api/documentViewApi';
import type { TextSubtype } from '../../api/documentViewApi';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OptionsSelector, type OptionsSelectorOption } from '@/components/ui/options-selector';
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
          document={document}
          node={node}
          onTextChange={actions.onTextChange}
          onResetCodeBlockStyle={() => actions.onResetCodeBlockStyle?.(node.id)}
          onOpenManageFonts={actions.onOpenManageFonts ?? (() => undefined)}
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
  { value: 'rich', label: 'Rich Text' },
  { value: 'block', label: 'Text Block' },
  { value: 'list', label: 'List Block' },
  { value: 'code', label: 'Code Block' },
];

export function getTextSubtypeIcon(subtype: TextSubtype): LucideIcon {
  if (subtype === 'rich') {
    return PencilLine;
  }
  if (subtype === 'code') {
    return CodeXml;
  }
  if (subtype === 'list') {
    return ListOrdered;
  }
  return TextInitial;
}

function SubtypeSwitcher({ node, actions }: { node: InspectorNode | null; actions: InspectorActionHandlers }) {
  const [pendingSubtype, setPendingSubtype] = useState<TextSubtype | null>(null);
  if (!node || !isTextNodeGuard(node)) return null;
  const textNode = node;
  const current = textNode.subtype as TextSubtype;
  const richBlockCount = textNode.subtype === 'rich' ? getTextDocumentBlocks(textNode.content).length : 0;
  const options: OptionsSelectorOption[] = TEXT_SUBTYPES.map(({ value, label }) => {
    const Icon = getTextSubtypeIcon(value);
    const tooltipLabel = label;
    return {
      value,
      label,
      ariaLabel: `Switch text subtype to ${tooltipLabel}`,
      icon: <Icon className="h-3.5 w-3.5" />,
      tooltip: <div className="leading-3.5 font-medium">{tooltipLabel}</div>,
    };
  });

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
      <OptionsSelector
        ariaLabel="Text subtype"
        display="icon"
        size="compact"
        value={current}
        options={options}
        onValueChange={(value) => handleSubtypeClick(value as TextSubtype)}
      />
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
          onSetTextDocumentContent={(content) => actions.onSetTextDocumentContent?.(node.id, content)}
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
          onSetTextDocumentContent={(content) => actions.onSetTextDocumentContent?.(node.id, content)}
          onSetCodeLanguage={(language) => actions.onTextChange('codeLanguage', language)}
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
          onSetTextDocumentContent={(content) => actions.onSetTextDocumentContent?.(node.id, content)}
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

const textAnimationSection: InspectorSectionDefinition = {
  id: 'animation',
  render: ({ node, actions, focusedMode }) =>
    isAnyTextNode(node) ? <AnimationSection node={node} actions={actions} focusedMode={focusedMode} /> : null,
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
    id: 'animation-behavior',
    bucket: 'behavior',
    title: 'Animation',
    description: 'Motion effects and trigger configuration.',
    sections: [textAnimationSection],
  }),
  createSectionBlock({
    id: 'content',
    bucket: 'primary',
    title: 'Content',
    description: 'Copy and semantic fields for text nodes.',
    sections: [textContentSection],
  }),
  createSectionBlock({
    id: 'text-style',
    bucket: 'primary',
    title: 'Text style',
    description: 'Typography controls.',
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
  return Boolean(node && isTextNodeGuard(node) && !(node.link !== undefined && node.style?.background !== undefined));
}

// Non-rich standalone subtypes — used for shared text style and appearance panels
function isNonRichTextNode(node: InspectorNode | null): node is TextInspectorNode {
  return Boolean(node && isAnyTextNode(node) && node.subtype !== 'rich');
}
