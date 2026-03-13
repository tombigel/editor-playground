import type { DocumentNode, WrapperNode } from '../model/types';
import { formatValue, parseHeightValue, parseUnitValue, parseWidthValue } from '../model/units';
import { useEffect, useState } from 'react';

type Props = {
  node: DocumentNode | null;
  onTextChange: (field: string, value: string) => void;
  onWrapperStyleChange: (field: 'background', value: string) => void;
  onRectChange: (field: 'x' | 'y' | 'width' | 'height', value: string) => void;
  onPromote: (role: 'header' | 'footer') => void;
  onDemote: () => void;
  onDelete: () => void;
  onStickyEnabled: (enabled: boolean) => void;
  onStickyTarget: (target: 'self' | 'contentWrapper') => void;
  onStickyEdges: (edge: 'top' | 'bottom' | 'both') => void;
  onStickyOffset: (value: number) => void;
  onStickyDuration: (value: number) => void;
};

export function InspectorPanel({
  node,
  onTextChange,
  onWrapperStyleChange,
  onRectChange,
  onPromote,
  onDemote,
  onDelete,
  onStickyEnabled,
  onStickyTarget,
  onStickyEdges,
  onStickyOffset,
  onStickyDuration,
}: Props) {
  if (!node) {
    return (
      <aside className="panel">
        <h2>Inspector</h2>
        <p>Select a node.</p>
      </aside>
    );
  }

  return (
    <aside className="panel">
      <h2>Inspector</h2>
      <label>
        Name
        <input value={node.name} onChange={(e) => onTextChange('name', e.target.value)} />
      </label>
      {node.type !== 'site' && (
        <>
          <div className="grid-fields">
            <Field
              label="X"
              value={node.rect.x.base.raw}
              onChange={(value) => onRectChange('x', value)}
              validate={(value) => validateUnitField(value, 'x')}
            />
            <Field
              label="Y"
              value={node.rect.y.base.raw}
              onChange={(value) => onRectChange('y', value)}
              validate={(value) => validateUnitField(value, 'y')}
            />
            <Field
              label="Width"
              value={node.rect.width.base.raw}
              onChange={(value) => onRectChange('width', value)}
              validate={(value) => validateUnitField(value, 'width')}
            />
            <Field
              label="Height"
              value={node.rect.height.base.raw}
              onChange={(value) => onRectChange('height', value)}
              validate={(value) => validateUnitField(value, 'height')}
            />
          </div>
          {node.type === 'wrapper' && (
            <>
              <label>
                Background
                <input
                  type="color"
                  value={normalizeColorInputValue(node.style.background)}
                  onChange={(e) => onWrapperStyleChange('background', e.target.value)}
                />
              </label>
              <WrapperActions node={node} onPromote={onPromote} onDemote={onDemote} />
            </>
          )}
          {node.type === 'leaf' && node.role === 'text' && (
            <label>
              Content
              <textarea value={node.content} onChange={(e) => onTextChange('content', e.target.value)} />
            </label>
          )}
          {node.type === 'leaf' && node.role === 'button' && (
            <label>
              Label
              <input value={node.label} onChange={(e) => onTextChange('label', e.target.value)} />
            </label>
          )}
          {node.type === 'leaf' && node.role === 'link' && (
            <>
              <label>
                Label
                <input value={node.label} onChange={(e) => onTextChange('label', e.target.value)} />
              </label>
              <label>
                Href
                <input value={node.href ?? ''} onChange={(e) => onTextChange('href', e.target.value)} />
              </label>
            </>
          )}
          {node.type === 'leaf' && node.role === 'image' && (
            <>
              <label>
                Src
                <input value={node.src ?? ''} onChange={(e) => onTextChange('src', e.target.value)} />
              </label>
              <label>
                Alt
                <input value={node.alt ?? ''} onChange={(e) => onTextChange('alt', e.target.value)} />
              </label>
            </>
          )}
          <div className="panel-group">
            <h3>Sticky</h3>
            <label className="row">
              <span>Enabled</span>
              <input
                type="checkbox"
                checked={Boolean(node.sticky?.enabled)}
                onChange={(e) => onStickyEnabled(e.target.checked)}
              />
            </label>
            <label>
              Target
              <select
                value={node.sticky?.target ?? 'self'}
                onChange={(e) => onStickyTarget(e.target.value as 'self' | 'contentWrapper')}
                disabled={node.type !== 'wrapper'}
              >
                <option value="self">Self</option>
                <option value="contentWrapper">Content wrapper</option>
              </select>
            </label>
            <label>
              Edge
              <select
                value={edgeValue(node)}
                onChange={(e) => onStickyEdges(e.target.value as 'top' | 'bottom' | 'both')}
              >
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="both">Both</option>
              </select>
            </label>
            <label>
              Offset
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={stickyOffsetVh(node)}
                onChange={(e) => onStickyOffset(Number(e.target.value))}
              />
              <span>{stickyOffsetVh(node)}vh</span>
            </label>
            <label>
              Duration
              <input
                type="range"
                min={0}
                max={400}
                step={25}
                value={stickyDurationVh(node)}
                onChange={(e) => onStickyDuration(Number(e.target.value))}
              />
              <span>{stickyDurationVh(node)}vh</span>
            </label>
          </div>
          <button className="danger" onClick={onDelete}>
            Delete
          </button>
          <div className="panel-group">
            <h3>Parsed</h3>
            <code>{formatValue(node.rect.width.base.parsed as never)}</code>
            <code>{formatValue(node.rect.height.base.parsed as never)}</code>
          </div>
        </>
      )}
    </aside>
  );
}

function Field({
  label,
  value,
  onChange,
  validate,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  validate?: (value: string) => boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDraft(value);
    setInvalid(false);
  }, [value]);

  return (
    <label className={invalid ? 'field-invalid' : undefined}>
      {label}
      <input
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          if (!validate) {
            onChange(next);
            return;
          }
          const isValid = validate(next);
          setInvalid(!isValid);
          if (isValid) {
            onChange(next);
          }
        }}
      />
    </label>
  );
}

function WrapperActions({
  node,
  onPromote,
  onDemote,
}: {
  node: WrapperNode;
  onPromote: (role: 'header' | 'footer') => void;
  onDemote: () => void;
}) {
  return (
    <div className="panel-group">
      <h3>Role</h3>
      <div className="chip-row">
        <span className="chip">{node.role}</span>
        {node.role === 'section' || node.role === 'container' ? (
          <>
            <button onClick={() => onPromote('header')}>Promote to header</button>
            <button onClick={() => onPromote('footer')}>Promote to footer</button>
          </>
        ) : (
          <button onClick={onDemote}>Demote to section</button>
        )}
      </div>
    </div>
  );
}

function normalizeColorInputValue(value: string | undefined) {
  if (value && /^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }
  return '#ffffff';
}

function edgeValue(node: Exclude<DocumentNode, { type: 'site' }>) {
  const top = node.sticky?.edges.top;
  const bottom = node.sticky?.edges.bottom;
  if (top && bottom) {
    return 'both';
  }
  if (bottom) {
    return 'bottom';
  }
  return 'top';
}

function stickyDurationVh(node: Exclude<DocumentNode, { type: 'site' }>) {
  const duration = node.sticky?.duration.parsed;
  if (!duration) {
    return 50;
  }
  if (duration.unit === 'vh') {
    return duration.value;
  }
  return 50;
}

function stickyOffsetVh(node: Exclude<DocumentNode, { type: 'site' }>) {
  const offset = node.sticky?.offsetTop?.parsed ?? node.sticky?.offsetBottom?.parsed;
  if (!offset) {
    return 0;
  }
  return offset.unit === 'vh' ? offset.value : 0;
}

function validateUnitField(
  value: string,
  field: 'x' | 'y' | 'width' | 'height',
) {
  try {
    if (field === 'width') {
      parseWidthValue(value);
    } else if (field === 'height') {
      parseHeightValue(value);
    } else {
      parseUnitValue(value);
    }
    return true;
  } catch {
    return false;
  }
}
