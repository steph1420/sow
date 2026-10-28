type Props = {
  count: number
  onMark: () => void
  onClear: () => void
  onDone: () => void
}

export function SelectBar({ count, onMark, onClear, onDone }: Props) {
  const enabled = count > 0
  return (
    <div className="sw-sel-bar">
      {count} selected
      <div className="act">
        <button type="button" className="primary" disabled={!enabled} onClick={onMark}>
          Mark
        </button>
        <button type="button" disabled={!enabled} onClick={onClear}>
          Clear
        </button>
        <button type="button" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  )
}
