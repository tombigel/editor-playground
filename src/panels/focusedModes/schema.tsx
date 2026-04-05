import { SquareArrowRightEnter } from 'lucide-react';
import type { ReactNode } from 'react';
import type { FocusedMode } from '../../api/editorApi';
import { getFocusedModeLabel } from '../../editor/focusedModes';
import {
  ButtonAppearanceSection,
  ButtonContentSection,
  ImageContentSection,
  ImageDesignSection,
  LinkAppearanceSection,
  LinkContentSection,
  TextAppearanceSection,
  TextContentSection,
} from '../inspector/ContentSections';
import {
  InspectorSectionCard,
  NodeBasicsSection,
  WrapperDesignSection,
  type InspectorSectionHeaderAction,
} from '../inspector/CommonSections';
import { StickySection } from '../inspector/StickySection';
import type { InspectorSectionContext, ResolvedInspectorBlock } from '../inspector/types';

type FocusedModeOptions = {
  headerContent?: ReactNode;
  onExitFocusedMode?: () => void;
};

export function resolveFocusedModeBlocks(
  mode: FocusedMode,
  context: InspectorSectionContext,
  options: FocusedModeOptions = {},
): ResolvedInspectorBlock[] {
  if (!mode) {
    return [];
  }

  const node = context.node && context.node.type !== 'site' ? context.node : null;
  const headerAction = createHeaderAction(mode, options.onExitFocusedMode);

  if (mode === 'sticky' && node) {
    return [
      createFocusedModeBlock('sticky-behavior', 'behavior', () => (
        <StickySection
          node={node}
          actions={context.actions}
          focusedMode={context.focusedMode}
          globalStickyElevation={context.globalStickyElevation}
          headerContent={options.headerContent}
          headerAction={headerAction}
          contentClassName="space-y-3 px-3 pt-1.5 pb-5"
        />
      )),
    ];
  }

  if (mode === 'layout' && node) {
    return [
      createFocusedModeBlock('layout', 'primary', () => (
        <NodeBasicsSection
          node={node}
          orderState={context.orderState}
          actions={context.actions}
          focusedMode={context.focusedMode}
          headerContent={options.headerContent}
          headerAction={headerAction}
        />
      )),
    ];
  }

  if (mode === 'content' && node) {
    if (node.type === 'leaf' && node.role === 'text') {
      return [
        createFocusedModeBlock('content', 'primary', () => (
          <TextContentSection
            document={context.document}
            node={node}
            onTextChange={context.actions.onTextChange}
            focusedMode={context.focusedMode}
            onEnterFocusedMode={context.actions.onEnterFocusedMode}
            headerContent={options.headerContent}
            headerAction={headerAction}
            contentClassName="px-3 pt-1.5 pb-5"
          />
        )),
      ];
    }
    if (node.type === 'leaf' && node.role === 'link') {
      return [
        createFocusedModeBlock('content', 'primary', () => (
          <LinkContentSection
            document={context.document}
            node={node}
            onTextChange={context.actions.onTextChange}
            focusedMode={context.focusedMode}
            onEnterFocusedMode={context.actions.onEnterFocusedMode}
            headerContent={options.headerContent}
            headerAction={headerAction}
            contentClassName="space-y-2.5 px-3 pt-1.5 pb-5"
          />
        )),
      ];
    }
    if (node.type === 'leaf' && node.role === 'button') {
      return [
        createFocusedModeBlock('content', 'primary', () => (
          <ButtonContentSection
            document={context.document}
            node={node}
            onTextChange={context.actions.onTextChange}
            focusedMode={context.focusedMode}
            onEnterFocusedMode={context.actions.onEnterFocusedMode}
            headerContent={options.headerContent}
            headerAction={headerAction}
            contentClassName="space-y-2.5 px-3 pt-1.5 pb-5"
          />
        )),
      ];
    }
    if (node.type === 'leaf' && node.role === 'image') {
      return [
        createFocusedModeBlock('content', 'primary', () => (
          <ImageContentSection
            node={node}
            onTextChange={context.actions.onTextChange}
            focusedMode={context.focusedMode}
            onEnterFocusedMode={context.actions.onEnterFocusedMode}
            headerContent={options.headerContent}
            headerAction={headerAction}
            contentClassName="space-y-2.5 px-3 pt-1.5 pb-5"
          />
        )),
      ];
    }
  }

  if (mode === 'design' && node) {
    if (node.type === 'wrapper') {
      return [
        createFocusedModeBlock('design', 'primary', () => (
          <WrapperDesignSection
            node={node}
            onWrapperStyleChange={context.actions.onWrapperStyleChange}
            focusedMode={context.focusedMode}
            onEnterFocusedMode={context.actions.onEnterFocusedMode}
            headerContent={options.headerContent}
            headerAction={headerAction}
            contentClassName="space-y-2.5 px-3 pt-1.5 pb-5"
          />
        )),
      ];
    }
    if (node.type === 'leaf' && node.role === 'text') {
      return [
        createFocusedModeBlock('design', 'primary', () => (
          <TextAppearanceSection
            document={context.document}
            node={node}
            onTextChange={context.actions.onTextChange}
            onOpenManageFonts={context.actions.onOpenManageFonts ?? (() => undefined)}
            focusedMode={context.focusedMode}
            onEnterFocusedMode={context.actions.onEnterFocusedMode}
            headerContent={options.headerContent}
            headerAction={headerAction}
            contentClassName="space-y-2.5 px-3 pt-1.5 pb-5"
          />
        )),
      ];
    }
    if (node.type === 'leaf' && node.role === 'link') {
      return [
        createFocusedModeBlock('design', 'primary', () => (
          <LinkAppearanceSection
            document={context.document}
            node={node}
            onTextChange={context.actions.onTextChange}
            onOpenManageFonts={context.actions.onOpenManageFonts ?? (() => undefined)}
            focusedMode={context.focusedMode}
            onEnterFocusedMode={context.actions.onEnterFocusedMode}
            headerContent={options.headerContent}
            headerAction={headerAction}
            contentClassName="space-y-2.5 px-3 pt-1.5 pb-5"
          />
        )),
      ];
    }
    if (node.type === 'leaf' && node.role === 'button') {
      return [
        createFocusedModeBlock('design', 'primary', () => (
          <ButtonAppearanceSection
            document={context.document}
            node={node}
            onTextChange={context.actions.onTextChange}
            onOpenManageFonts={context.actions.onOpenManageFonts ?? (() => undefined)}
            focusedMode={context.focusedMode}
            onEnterFocusedMode={context.actions.onEnterFocusedMode}
            headerContent={options.headerContent}
            headerAction={headerAction}
            contentClassName="space-y-2.5 px-3 pt-1.5 pb-5"
          />
        )),
      ];
    }
    if (node.type === 'leaf' && node.role === 'image') {
      return [
        createFocusedModeBlock('design', 'primary', () => (
          <ImageDesignSection
            node={node}
            onTextChange={context.actions.onTextChange}
            focusedMode={context.focusedMode}
            onEnterFocusedMode={context.actions.onEnterFocusedMode}
            headerContent={options.headerContent}
            headerAction={headerAction}
            contentClassName="space-y-2.5 px-3 pt-1.5 pb-5"
          />
        )),
      ];
    }
  }

  return [
    {
      id: `${mode}-empty`,
      bucket: 'behavior',
      align: 'stretch',
      layout: 'custom',
      sections: [],
      render: () => (
        <InspectorSectionCard
          title={getFocusedModeLabel(mode)}
          headerContent={
            options.headerContent ?? <div className="editor-text-strong text-sm font-medium">{getFocusedModeLabel(mode)}</div>
          }
          headerAction={headerAction}
          contentClassName="px-3 py-3"
        >
          <div className="editor-text-strong text-xs font-medium">Nothing to edit yet</div>
          <div className="editor-text-muted mt-1 text-xs leading-5">
            Select a non-site node to edit its {mode} controls from focused mode.
          </div>
        </InspectorSectionCard>
      ),
    },
  ];
}

function createFocusedModeBlock(
  id: string,
  bucket: ResolvedInspectorBlock['bucket'],
  render: () => ReactNode,
): ResolvedInspectorBlock {
  return {
    id,
    bucket,
    align: 'stretch',
    layout: 'custom',
    sections: [],
    render,
  };
}

function createHeaderAction(
  mode: Exclude<FocusedMode, null>,
  onExitFocusedMode?: () => void,
): InspectorSectionHeaderAction | undefined {
  if (!onExitFocusedMode) {
    return undefined;
  }

  return {
    ariaLabel: `Close ${mode} focus mode`,
    icon: <SquareArrowRightEnter className="h-3.5 w-3.5" />,
    onClick: onExitFocusedMode,
  };
}
