import type { LeafRole } from '../model/types';

type Props = {
  onInsertWrapper: (role: 'section' | 'container') => void;
  onInsertLeaf: (role: LeafRole) => void;
};

export function InsertPanel({ onInsertWrapper, onInsertLeaf }: Props) {
  return (
    <aside className="panel">
      <h2>Insert</h2>
      <div className="panel-group">
        <h3>Wrappers</h3>
        <button onClick={() => onInsertWrapper('section')}>Section</button>
        <button onClick={() => onInsertWrapper('container')}>Container</button>
      </div>
      <div className="panel-group">
        <h3>Components</h3>
        <button onClick={() => onInsertLeaf('text')}>Text</button>
        <button onClick={() => onInsertLeaf('image')}>Image</button>
        <button onClick={() => onInsertLeaf('link')}>Link</button>
        <button onClick={() => onInsertLeaf('button')}>Button</button>
      </div>
    </aside>
  );
}
