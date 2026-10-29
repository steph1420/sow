/**
 * v0.35.0 colour themes (Steve t48u; mocks themepicker-mj1 + theme-mj2-all LOCKED).
 * Source: tweakcn registry, oklch → hex, contrast-fixed copies in sow-mockups/themes/fixed-*.json.
 * Locks: Default first · follows Night/Day · dark text on primary OK (1–4) · theme 7 Day primary deepened
 * (ticks ≥3:1) · system font only · Submitted/Warn/Left (--sub/--warn/--danger) never overridden.
 */
export type Mode = 'night' | 'day'
type Raw = Record<'background' | 'foreground' | 'card' | 'muted' | 'muted-foreground' | 'primary' | 'primary-foreground' | 'border', string>
type Theme = { id: string; name: string; night: Raw; day: Raw }

const THEMES_RAW: Theme[] = [
 {
  "id": "1-tangerine-orange",
  "name": "Tangerine Orange",
  "night": {
   "background": "#151b21",
   "foreground": "#e4e4e4",
   "card": "#1e252e",
   "muted": "#222933",
   "muted-foreground": "#9e9e9e",
   "primary": "#f76046",
   "primary-foreground": "#2b2b2b",
   "border": "#313942"
  },
  "day": {
   "background": "#f9fafb",
   "foreground": "#292929",
   "card": "#ffffff",
   "muted": "#f4f5f6",
   "muted-foreground": "#5d646c",
   "primary": "#f76046",
   "primary-foreground": "#2b2b2b",
   "border": "#e3e5e7"
  }
 },
 {
  "id": "2-agartha-theme",
  "name": "Agartha theme",
  "night": {
   "background": "#010c13",
   "foreground": "#e7e9ea",
   "card": "#020f18",
   "muted": "#031a2b",
   "muted-foreground": "#75797d",
   "primary": "#1c9cf0",
   "primary-foreground": "#2f2f2f",
   "border": "#0a1a29"
  },
  "day": {
   "background": "#fafdff",
   "foreground": "#0f1419",
   "card": "#ffffff",
   "muted": "#f0f9ff",
   "muted-foreground": "#4778a9",
   "primary": "#1e9df1",
   "primary-foreground": "#2f2f2f",
   "border": "#e1eaef"
  }
 },
 {
  "id": "3-sky",
  "name": "Sky",
  "night": {
   "background": "#151d2a",
   "foreground": "#fafafa",
   "card": "#1b2533",
   "muted": "#242d3b",
   "muted-foreground": "#9099a6",
   "primary": "#2b7fff",
   "primary-foreground": "#1c1c1c",
   "border": "#293442"
  },
  "day": {
   "background": "#ffffff",
   "foreground": "#0a0a0a",
   "card": "#ffffff",
   "muted": "#f5f5f5",
   "muted-foreground": "#737373",
   "primary": "#1447e6",
   "primary-foreground": "#fafafa",
   "border": "#e5e5e5"
  }
 },
 {
  "id": "4-exploremiam",
  "name": "ExploreMiam",
  "night": {
   "background": "#060b19",
   "foreground": "#ffffff",
   "card": "#0f172a",
   "muted": "#1e293b",
   "muted-foreground": "#94a3b8",
   "primary": "#6366f1",
   "primary-foreground": "#070707",
   "border": "#1e293b"
  },
  "day": {
   "background": "#f8fafc",
   "foreground": "#0f172a",
   "card": "#ffffff",
   "muted": "#f1f5f9",
   "muted-foreground": "#475569",
   "primary": "#4f46e5",
   "primary-foreground": "#ffffff",
   "border": "#e2e8f0"
  }
 },
 {
  "id": "5-minimal-forest",
  "name": "Minimal Forest",
  "night": {
   "background": "#1c2a1f",
   "foreground": "#f0ebe5",
   "card": "#2d3a2e",
   "muted": "#252f26",
   "muted-foreground": "#d7cfc4",
   "primary": "#4caf50",
   "primary-foreground": "#0a1f0c",
   "border": "#3e4a3d"
  },
  "day": {
   "background": "#ffffff",
   "foreground": "#111111",
   "card": "#f7f7f7",
   "muted": "#f0f0f0",
   "muted-foreground": "#686868",
   "primary": "#1a6b3a",
   "primary-foreground": "#ffffff",
   "border": "#e0e0e0"
  }
 },
 {
  "id": "6-vivid-sky",
  "name": "Vivid Sky",
  "night": {
   "background": "#141c30",
   "foreground": "#e2e8f0",
   "card": "#212b3e",
   "muted": "#1c2639",
   "muted-foreground": "#8f96a3",
   "primary": "#5085fb",
   "primary-foreground": "#141c30",
   "border": "#3e4858"
  },
  "day": {
   "background": "#ffffff",
   "foreground": "#0a0a0a",
   "card": "#ffffff",
   "muted": "#e5e7eb",
   "muted-foreground": "#737373",
   "primary": "#1447e6",
   "primary-foreground": "#fafafa",
   "border": "#dadee4"
  }
 },
 {
  "id": "7-cutespringtheme",
  "name": "CuteSpringTheme",
  "night": {
   "background": "#2d1b22",
   "foreground": "#fff0f3",
   "card": "#3d262e",
   "muted": "#4a313a",
   "muted-foreground": "#d4bcc4",
   "primary": "#ff8da1",
   "primary-foreground": "#2d1b22",
   "border": "#5d404a"
  },
  "day": {
   "background": "#fff9fb",
   "foreground": "#5d4037",
   "card": "#ffffff",
   "muted": "#fdf2f5",
   "muted-foreground": "#8d6a75",
   "primary": "#ffb7c5",
   "primary-foreground": "#555555",
   "border": "#ffe1e9"
  }
 },
 {
  "id": "8-black-and-pink",
  "name": "Black and pink",
  "night": {
   "background": "#000000",
   "foreground": "#ffffff",
   "card": "#000000",
   "muted": "#111111",
   "muted-foreground": "#aaaaaa",
   "primary": "#ff00c8",
   "primary-foreground": "#000000",
   "border": "#333333"
  },
  "day": {
   "background": "#ffffff",
   "foreground": "#000000",
   "card": "#fafafa",
   "muted": "#f2f2f2",
   "muted-foreground": "#595959",
   "primary": "#ff00c8",
   "primary-foreground": "#000000",
   "border": "#e5e5e5"
  }
 }
]

// t48u lock 4: theme 7 Day primary deepened #ffb7c5 → #e64980 (3.6:1 on #fff9fb) so ticks read clearly.
const THEMES: Theme[] = THEMES_RAW.map((t) => (t.id === '7-cutespringtheme' ? { ...t, day: { ...t.day, primary: '#e64980' } } : t))

export const PALETTES: { id: string; name: string; swatch: string[] }[] = [
  { id: 'default', name: 'Default (Quiet Lucid)', swatch: ['#0a0b0e', '#111318', '#15171c', '#30d158', '#f2f3f5'] },
  ...THEMES.map((t) => ({ id: t.id, name: t.name, swatch: [t.night.background, t.night.card, t.night.muted, t.night.primary, t.night.foreground] })),
]

const hex = (c: string): [number, number, number] => {
  const h = c.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}
const toHex = (r: number[]) => '#' + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
const lum = (c: string) => {
  const [r, g, b] = hex(c).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
const mix = (a: string, b: string, t: number) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)) }
/** Nudge `c` toward `to` until it reaches `min` against every background. */
function ensure(c: string, bgs: string[], min: number, to: string): string {
  for (let t = 0; t <= 1.0001; t += 0.02) { const m = mix(c, to, t); if (bgs.every((b) => contrast(m, b) >= min)) return m }
  return to
}

export function paletteVars(id: string, mode: Mode): Record<string, string> {
  const t = THEMES.find((x) => x.id === id)
  if (!t) return {}
  const r = t[mode]
  const bg = r.background, surface = r.card, fg = r.foreground
  const ink = mode === 'day' ? '#000000' : '#ffffff'
  // Ticks / fills: primary must read ≥3:1 against card and page (theme 7 Day deepens here).
  const primary = ensure(r.primary, [surface, bg], 3, mode === 'day' ? '#000000' : '#ffffff')
  let onPrimary = r['primary-foreground']
  if (contrast(onPrimary, primary) < 4.5) {
    onPrimary = [onPrimary, '#ffffff', '#1a1a1a'].sort((a, b) => contrast(b, primary) - contrast(a, primary))[0]
  }
  const textTer = ensure(r['muted-foreground'], [bg, surface, r.muted], 4.5, ink)
  return {
    '--bg': bg,
    '--surface': surface,
    '--surface2': r.muted,
    '--border': r.border,
    '--border-soft': r.border,
    '--hairline': r.border,
    '--text': ensure(fg, [bg, surface], 4.5, ink),
    '--text-sec': ensure(mix(r['muted-foreground'], fg, 0.35), [bg, surface, r.muted], 4.5, ink),
    '--text-ter': textTer,
    '--ok': ensure(r.primary, [bg, surface, r.muted], 4.5, ink),
    '--primary': primary,
    '--on-primary': onPrimary,
    '--tint': primary,
    '--tint2': primary,
    '--sel': `color-mix(in srgb, ${primary} 10%, transparent)`,
    '--accent-soft': `color-mix(in srgb, ${primary} 14%, transparent)`,
    '--chrome-bar': `color-mix(in srgb, ${bg} 92%, transparent)`,
  }
}

const KEYS = Object.keys(paletteVars(THEMES[0].id, 'night'))
export function applyPalette(id: string, mode: Mode): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const v = paletteVars(id, mode)
  for (const k of KEYS) root.style.removeProperty(k)
  for (const [k, val] of Object.entries(v)) root.style.setProperty(k, val)
  if (Object.keys(v).length) root.dataset.palette = id
  else delete root.dataset.palette
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', v['--bg'] ?? (mode === 'day' ? '#f4f5f7' : '#0a0b0e'))
}
