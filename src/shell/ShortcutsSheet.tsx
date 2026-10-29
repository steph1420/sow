import { SHORTCUTS } from '../lib/keyboard'

/** "?" sheet — lists every shortcut from the single SHORTCUTS table (v0.37.0). */
export function ShortcutsSheet({ onClose }: { onClose: () => void }) {
  return (
    <>
      <button type="button" className="kb-sheet-scrim" aria-label="Dismiss keyboard shortcuts" onClick={onClose} />
      <div className="kb-sheet" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
        <div className="kb-head">
          <h2>Keyboard shortcuts</h2>
          <button type="button" className="kb-close" data-dialog-close aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="kb-body">
          {SHORTCUTS.map((g) => (
            <section key={g.group}>
              <h3>{g.group}</h3>
              <dl>
                {g.items.map(([k, v]) => (
                  <div className="kb-row" key={k}>
                    <dt>{k.split('  ').map((part, i) => <kbd key={i}>{part.trim()}</kbd>)}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
