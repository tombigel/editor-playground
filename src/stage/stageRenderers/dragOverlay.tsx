import type { CSSProperties } from 'react';
import type { DragGuide, DragPreviewItem } from '../../api/types';
import type { DocumentModel, DocumentNode, MediaNode } from '../../model/types';
import { isSiteNode, isContainerNode, isLeafNode, isMediaNode } from '../../model/types';
import { getLeafInlineStyle, styleRecordToReactStyle } from '../../render/leafPresentation';
import { isBrandMark, renderLeafContent } from '../../render/nodePresentation';
import {
  getContentWrapperBaseStyle,
  getContentWrapperPaddingStyle,
  getContentWrapperSurfaceStyle,
  getWrapperBorderStyle,
  resolveWrapperRenderPlan,
} from '../../render/layout';
import type { DragState } from '../types';

type DragPreviewOverlayProps = {
  document: DocumentModel;
  previewItems?: DragPreviewItem[];
  previewLeft?: number;
  previewTop?: number;
  dragState?: Exclude<DragState, null>;
};

type SnapGuideOverlayProps = {
  guideX: DragGuide | null;
  guideY: DragGuide | null;
};

export function DragPreviewOverlay(props: DragPreviewOverlayProps) {
  const document = props.document;
  const previewItems =
    props.dragState
      ? props.dragState.previewItems ?? [
          {
            nodeId: props.dragState.nodeId,
            offsetX: 0,
            offsetY: 0,
            width: props.dragState.previewWidth,
            height: props.dragState.previewHeight,
          },
        ]
      : props.previewItems ?? [];
  const previewLeft =
    props.dragState
      ? props.dragState.startClientX - props.dragState.grabOffsetX
      : props.previewLeft ?? 0;
  const previewTop =
    props.dragState
      ? props.dragState.startClientY - props.dragState.grabOffsetY
      : props.previewTop ?? 0;
  return (
    <div
      className="drag-preview-container"
      style={{
        transform: `translate(${previewLeft}px, ${previewTop}px)`,
      }}
    >
      {previewItems.map((item) => {
        const node = document.nodes[item.nodeId];
        if (!node || isSiteNode(node)) {
          return null;
        }

        const style: CSSProperties = {
          left: `${item.offsetX}px`,
          top: `${item.offsetY}px`,
          width: `${item.width}px`,
          height: `${item.height}px`,
        };

        return (
          <div key={item.nodeId} className="drag-preview" style={style}>
            {renderDragPreviewNode(document, node)}
          </div>
        );
      })}
    </div>
  );
}

function snapGuideSourceClass(source: string) {
  switch (source) {
    case 'page': return 'snap-guide-page';
    case 'section': return 'snap-guide-section';
    case 'header': return 'snap-guide-header';
    case 'footer': return 'snap-guide-footer';
    case 'container': return 'snap-guide-container';
    default: return 'snap-guide-component';
  }
}

export function SnapGuideOverlay(props: SnapGuideOverlayProps) {
  const { guideX, guideY } = props;
  return (
    <>
      {guideX ? (
        <div
          className={`snap-guide snap-guide-vertical ${snapGuideSourceClass(guideX.source)}${
            guideX.anchor === 'center' ? ' snap-guide-center' : ''
          }`}
          style={{ left: `${guideX.value}px` }}
        />
      ) : null}
      {guideY ? (
        <div
          className={`snap-guide snap-guide-horizontal ${snapGuideSourceClass(guideY.source)}${
            guideY.anchor === 'center' ? ' snap-guide-center' : ''
          }`}
          style={{ top: `${guideY.value}px` }}
        />
      ) : null}
    </>
  );
}

function renderDragPreviewNode(
  document: DocumentModel,
  node: Exclude<DocumentNode, { contentType: 'site' }>,
  placementStyle: CSSProperties = {},
) {
  if (isContainerNode(node)) {
    const plan = resolveWrapperRenderPlan(document, node, {}, undefined, { includeHidden: true });
    return (
      <div
        className={`drag-preview-inner drag-preview-wrapper role-${node.subtype}`}
        style={{
          ...placementStyle,
          ...getWrapperBorderStyle(node),
        }}
      >
        <div
          className="drag-preview-content-wrapper content-wrapper"
          style={{
            ...getContentWrapperBaseStyle(node),
            ...getContentWrapperPaddingStyle(node),
            display: 'grid',
            gridTemplateColumns: plan.meshLayout.columnTemplate,
            gridTemplateRows: plan.meshLayout.rowTemplate,
          }}
        >
          <div className="content-wrapper-surface" aria-hidden="true" style={getContentWrapperSurfaceStyle(node)} />
          {plan.children.map((child) =>
            renderDragPreviewNode(
              document,
              child,
              plan.meshLayout.childPlacements[child.id],
            ),
          )}
        </div>
      </div>
    );
  }

  if (!isLeafNode(node)) return null;

  return (
    <div
      data-node-id={node.id}
      className={`drag-preview-inner stage-leaf role-${node.subtype} ${isBrandMark(node) ? 'is-brand-mark' : ''}`}
      style={{
        ...placementStyle,
        width: '100%',
        height: '100%',
      }}
    >
      <div
        className="stage-leaf-body"
        style={isMediaNode(node) ? styleRecordToReactStyle(getLeafInlineStyle(node)) : undefined}
      >
        {isMediaNode(node) && node.subtype === 'video'
          ? renderDragPreviewVideo(node)
          : renderLeafContent(node, {
              contentStyle: isMediaNode(node) ? undefined : styleRecordToReactStyle(getLeafInlineStyle(node)),
              imageClassName: 'stage-image',
              imagePlaceholderClassName: 'image-placeholder',
              imageDraggable: false,
              disableTabNavigation: true,
            })}
      </div>
    </div>
  );
}

function renderDragPreviewVideo(node: MediaNode) {
  if (!node.src) {
    return (
      <div className="image-placeholder" style={{ width: '100%', height: '100%' }}>
        Video
      </div>
    );
  }

  const fitStyle = styleRecordToReactStyle(getLeafInlineStyle(node));
  return (
    <video
      className="stage-video"
      poster={node.video?.poster || undefined}
      preload="none"
      muted
      playsInline
      tabIndex={-1}
      aria-label={node.video?.title || node.alt || 'Video'}
      style={{
        ...fitStyle,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
