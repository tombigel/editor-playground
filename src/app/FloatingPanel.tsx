import { useEffect, useMemo, useState } from 'react';

type Position = {
  x: number;
  y: number;
};

type DragState = {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
} | null;

type Props = {
  title: string;
  initialPosition: Position;
  width: number;
  collapsedHeight?: number;
  children: React.ReactNode;
};

export function FloatingPanel({
  title,
  initialPosition,
  width,
  collapsedHeight = 44,
  children,
}: Props) {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [collapsed, setCollapsed] = useState(false);
  const [dragState, setDragState] = useState<DragState>(null);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const handleMove = (event: MouseEvent) => {
      const nextX = dragState.originX + (event.clientX - dragState.startX);
      const nextY = dragState.originY + (event.clientY - dragState.startY);
      setPosition({
        x: Math.max(8, nextX),
        y: Math.max(8, nextY),
      });
    };

    const handleUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragState]);

  const panelStyle = useMemo(
    () => ({
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: `${width}px`,
      height: collapsed ? `${collapsedHeight}px` : undefined,
    }),
    [collapsed, collapsedHeight, position.x, position.y, width],
  );

  return (
    <div className={`floating-panel ${collapsed ? 'collapsed' : ''}`} style={panelStyle}>
      <div
        className="floating-panel-header"
        onMouseDown={(event) => {
          setDragState({
            startX: event.clientX,
            startY: event.clientY,
            originX: position.x,
            originY: position.y,
          });
        }}
      >
        <strong>{title}</strong>
        <button
          type="button"
          className="panel-collapse-button rounded-md px-2 py-1 transition-[background-color,color] duration-150 hover:bg-slate-100/80"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>
      {!collapsed ? <div className="floating-panel-body">{children}</div> : null}
    </div>
  );
}
