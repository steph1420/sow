import { Link } from 'react-router-dom'

export default function SettingsPage() {
  return (
    <div className="stub">
      <h2>Settings</h2>
      <p>Hide left + Sheet URL (UI-only until JB-6). (JB-4)</p>
      <p style={{ marginTop: 12 }}>JB-1 stub — night shell + routing only.</p>
      <p style={{ marginTop: 16 }}>
        <Link to="/history" style={{ color: 'var(--accent)', fontWeight: 600 }}>History →</Link>
      </p>
    </div>
  )
}
