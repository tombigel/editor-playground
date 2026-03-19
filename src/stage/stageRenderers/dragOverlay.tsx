import type { CSSProperties } from 'react';
import type { DocumentModel, DocumentNode } from '../../model/types';
import { getLeafInlineStyle, styleRecordToReactStyle } from '../../render/leafPresentation';
import { isBrandMark, renderLeafContent } from '../../render/nodePresentation';
import {
  getContentWrapperPaddingStyle,
  getContentWrapperSurfaceStyle,
  getWrapperBorderStyle,
} from '../../render/layout';
import type { DragState, SnapGuides } from '../types';

export function renderDragPreview(document: DocumentModel, dragState: Exclude<DragState, null>) {
  const previewItems = dragState.previewItems ?? [
    {
      nodeId: dragState.nodeId,
      offsetX: 0,
      offsetY: 0,
      width: dragState.previewWidth,
      height: dragState.previewHeight,
    },
  ];
  const baseLeft = dragState.currentClientX - dragState.grabOffsetX;
  const baseTop = dragState.currentClientY - dragState.grabOffsetY;

  return previewItems.map((item) => {
    const node = document.nodes[item.nodeId];
    if (!node || node.type === 'site') {
      return null;
    }

    const style: CSSProperties = {
      left: `${baseLeft + item.offsetX}px`,
      top: `${baseTop + item.offsetY}px`,
      width: `${item.width}px`,
      height: `${item.height}px`,
    };

    return (
      <div key={item.nodeId} className="drag-preview" style={style}>
        {renderDragPreviewNode(node)}
      </div>
    );
  });
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

export function renderSnapGuides(guides: SnapGuides) {
  return (
    <>
      {guides.x !== null ? (
        <div
          className={`snap-guide snap-guide-vertical ${guides.xSource === 'page' ? 'snap-guide-page' : 'snap-guide-component'}`}
          style={{ left: `${guides.x}px` }}
        />
      ) : null}
      {guides.y !== null ? (
        <div
          className={`snap-guide snap-guide-horizontal ${guides.ySource === 'page' ? 'snap-guide-page' : 'snap-guide-component'}`}
          style={{ top: `${guides.y}px` }}
        />
      ) : null}
    </>
  );
}
