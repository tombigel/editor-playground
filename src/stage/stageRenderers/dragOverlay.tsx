import { forwardRef, type CSSProperties, type RefObject } from 'react';
import type { DocumentModel, DocumentNode } from '../../model/types';
import { getLeafInlineStyle, styleRecordToReactStyle } from '../../render/leafPresentation';
import { isBrandMark, renderLeafContent } from '../../render/nodePresentation';
import {
  getContentWrapperPaddingStyle,
  getContentWrapperSurfaceStyle,
  getWrapperBorderStyle,
} from '../../render/layout';
import type { DragPosition, DragState } from '../types';

export const DragPreviewOverlay = forwardRef<HTMLDivElement, {
  document: DocumentModel;
  dragState: Exclude<DragState, null>;
}>(function DragPreviewOverlay({ document, dragState }, ref) {
  const previewItems = dragState.previewItems ?? [
    {
      nodeId: dragState.nodeId,
      offsetX: 0,
      offsetY: 0,
      width: dragState.previewWidth,
      height: dragState.previewHeight,
    },
  ];

  return (
    <div
      ref={ref}
      className="drag-preview-container"
      style={{
        transform: `translate(${dragState.startClientX - dragState.grabOffsetX}px, ${dragState.startClientY - dragState.grabOffsetY}px)`,
      }}
    >
      {previewItems.map((item) => {
        const node = document.nodes[item.nodeId];
        if (!node || node.type === 'site') {
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
            {renderDragPreviewNode(node)}
          </div>
        );
      })}
    </div>
  );
});

export function SnapGuideOverlay({
  xRef,
  yRef,
}: {
  xRef: RefObject<HTMLDivElement | null>;
  yRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <div
        ref={xRef}
        className="snap-guide snap-guide-vertical snap-guide-component"
        style={{ display: 'none' }}
      />
      <div
        ref={yRef}
        className="snap-guide snap-guide-horizontal snap-guide-component"
        style={{ display: 'none' }}
      />
    </>
  );
}

export function updateDragPreviewPosition(
  previewRef: RefObject<HTMLDivElement | null>,
  dragState: Exclude<DragState, null>,
  position: DragPosition,
) {
  if (!previewRef.current) return;
  const baseLeft = position.clientX - dragState.grabOffsetX;
  const baseTop = position.clientY - dragState.grabOffsetY;
  previewRef.current.style.transform = `translate(${baseLeft}px, ${baseTop}px)`;
}

export function updateSnapGuidePositions(
  xRef: RefObject<HTMLDivElement | null>,
  yRef: RefObject<HTMLDivElement | null>,
  position: DragPosition,
) {
  if (xRef.current) {
    if (position.guideX !== null) {
      xRef.current.style.display = '';
      xRef.current.style.left = `${position.guideX}px`;
      xRef.current.className = `snap-guide snap-guide-vertical ${
        position.guideXSource === 'page' ? 'snap-guide-page' : 'snap-guide-component'
      }`;
    } else {
      xRef.current.style.display = 'none';
    }
  }
  if (yRef.current) {
    if (position.guideY !== null) {
      yRef.current.style.display = '';
      yRef.current.style.top = `${position.guideY}px`;
      yRef.current.className = `snap-guide snap-guide-horizontal ${
        position.guideYSource === 'page' ? 'snap-guide-page' : 'snap-guide-component'
      }`;
    } else {
      yRef.current.style.display = 'none';
    }
  }
}

function renderDragPreviewNode(node: Exclude<DocumentNode, { type: 'site' }>) {
  if (node.type === 'wrapper') {
    return (
      <div
        className={`drag-preview-inner drag-preview-wrapper role-${node.role}`}
        style={{
          ...getWrapperBorderStyle(node),
        }}
      >
        <div
          className="drag-preview-content-wrapper content-wrapper"
          style={{
            width: '100%',
            height: '100%',
            ...getContentWrapperPaddingStyle(node),
          }}
        >
          <div className="content-wrapper-surface" aria-hidden="true" style={getContentWrapperSurfaceStyle(node)} />
        </div>
      </div>
    );
  }

  return (
    <div
      data-node-id={node.id}
      className={`drag-preview-inner stage-leaf role-${node.role} ${isBrandMark(node) ? 'is-brand-mark' : ''}`}
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      <div
        className="stage-leaf-body"
        style={node.role === 'image' ? styleRecordToReactStyle(getLeafInlineStyle(node)) : undefined}
      >
        {renderLeafContent(node, {
          contentStyle: node.role === 'image' ? undefined : styleRecordToReactStyle(getLeafInlineStyle(node)),
          imageClassName: 'stage-image',
          imagePlaceholderClassName: 'image-placeholder',
          imageDraggable: false,
          disableTabNavigation: true,
        })}
      </div>
    </div>
  );
}
