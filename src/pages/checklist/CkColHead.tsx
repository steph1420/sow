import CheckMark from '../../components/CheckMark'

type Props = {
  showTwoCol: boolean
  allOn1: boolean
  allOn2: boolean
  modeSet: boolean
  onCheckAll1?: () => void
  onCheckAll2?: () => void
  /** Single-col tick-all */
  allOn?: boolean
  onCheckAll?: () => void
}

export default function CkColHead({
  showTwoCol,
  allOn1,
  allOn2,
  modeSet,
  onCheckAll1,
  onCheckAll2,
  allOn,
  onCheckAll,
}: Props) {
  const onCls = (on: boolean) =>
    on ? (modeSet ? 'ck-tick-all is-set' : 'ck-tick-all is-sub') : 'ck-tick-all'

  return (
    <div className={`ck-col-head ${showTwoCol ? 'two-col' : 'one-col'}`}>
      <span />
      <span className="ck-n">Name</span>
      {showTwoCol ? (
        <>
          <span className="ck-tick-all-wrap">
            <button
              type="button"
              className={onCls(allOn1)}
              title="Check/uncheck all visible"
              aria-label="Check all date 1"
              onClick={onCheckAll1}
            >
              {allOn1 ? <CheckMark /> : null}
            </button>
          </span>
          <span className="ck-tick-all-wrap">
            <button
              type="button"
              className={onCls(allOn2)}
              title="Check/uncheck all visible"
              aria-label="Check all date 2"
              onClick={onCheckAll2}
            >
              {allOn2 ? <CheckMark /> : null}
            </button>
          </span>
        </>
      ) : (
        <span className="ck-tick-all-wrap">
          <button
            type="button"
            className={onCls(!!allOn)}
            title="Check/uncheck all visible"
            aria-label="Check all"
            onClick={onCheckAll}
          >
            {allOn ? <CheckMark /> : null}
          </button>
        </span>
      )}
    </div>
  )
}
