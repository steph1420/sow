type Props = {
  title: string
  body: string
  onBack: () => void
}

export function PlaceholderScreen({ title, body, onBack }: Props) {
  return (
    <div className="placeholder-page">
      <button type="button" className="back-link" onClick={onBack}>
        ← Back
      </button>
      <h1>{title}</h1>
      <p>{body}</p>
    </div>
  )
}
