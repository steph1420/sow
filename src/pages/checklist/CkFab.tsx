type Props = {
  showSort: boolean
  filtersActive: boolean
  onSort: () => void
  onFilters: () => void
}

/** Soft Sort/Filters cluster — only render when chrome.showFab. */
export default function CkFab({ showSort, filtersActive, onSort, onFilters }: Props) {
  return (
    <div className="ck-fab" role="toolbar" aria-label="Sort and filters">
      {showSort ? (
        <button type="button" className="ck-fab-btn" onClick={onSort}>
          <span className="ck-fab-ico" aria-hidden>
            ⇅
          </span>
          Sort
        </button>
      ) : null}
      <button
        type="button"
        className={`ck-fab-btn${filtersActive ? ' is-active' : ''}`}
        onClick={onFilters}
      >
        <span className="ck-fab-ico" aria-hidden>
          ⚙{filtersActive ? <span className="ck-fab-dot" /> : null}
        </span>
        Filters
      </button>
    </div>
  )
}
