import type { Mode } from './types'
import type { UndoChrome } from '../../lib/sowPrefs'

type Props = {
  mode: Mode
  onMode: (m: Mode) => void
  undoOk: boolean
  redoOk: boolean
  onUndo: () => void
  onRedo: () => void
  undoChrome: UndoChrome
}

export default function CkModeBar({
  mode,
  onMode,
  undoOk,
  redoOk,
  onUndo,
  onRedo,
  undoChrome,
}: Props) {
  return (
    <div className="ck-mode-row">
      <div className="ck-mode">
        <button
          type="button"
          className={mode === 'set' ? 'is-set' : ''}
          onClick={() => onMode('set')}
        >
          Set
        </button>
        <button
          type="button"
          className={mode === 'submitted' ? 'is-sub' : ''}
          onClick={() => onMode('submitted')}
        >
          Submitted
        </button>
      </div>
      <div className="ck-undo" data-undo-chrome={undoChrome}>
        <button
          type="button"
          className="ck-icon-btn"
          disabled={!undoOk}
          aria-label="Undo"
          onClick={onUndo}
        >
          <span aria-hidden>↶</span>
          {undoChrome === 'iconsLabel' ? <span className="ck-icon-lbl">Undo</span> : null}
        </button>
        <button
          type="button"
          className="ck-icon-btn"
          disabled={!redoOk}
          aria-label="Redo"
          onClick={onRedo}
        >
          <span aria-hidden>↷</span>
          {undoChrome === 'iconsLabel' ? <span className="ck-icon-lbl">Redo</span> : null}
        </button>
      </div>
    </div>
  )
}
