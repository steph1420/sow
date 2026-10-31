/** v0.44.5: show a sync URL without its deployment id (Beta/TEST link stays off-screen). */
export function maskUrl(u: string): string {
  const s = u.trim()
  if (!s) return ''
  const m = s.match(/^(https?:\/\/[^/]+)(\/.*?)?(\/[^/]*)?$/)
  if (!m) return '••••••'
  return `${m[1]}/…/••••••${m[3] && m[3] !== '/' ? m[3] : ''}`
}
