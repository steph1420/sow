// v0.30.1 (t4u) build check: dist carries package.json's version and the UI has no stale version literal.
import { readFileSync, readdirSync } from 'node:fs'
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const want = process.env.SOW_VERSION_OVERRIDE || pkg.version
const js = readdirSync('dist/assets').filter((f) => f.endsWith('.js')).map((f) => readFileSync(`dist/assets/${f}`, 'utf8')).join('\n')
const errs = []
if (![`"${want}"`, `'${want}'`, "`" + want + "`"].some((q) => js.includes(q))) errs.push(`dist bundle lacks version "${want}"`)
for (const f of ['src/more/SettingsPage.tsx', 'src/more/AboutPage.tsx']) {
  const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  const m = code.match(/v?\d+\.\d+\.\d+/)
  if (m) errs.push(`${f}: hardcoded version literal ${m[0]}`)
}
if (errs.length) { console.error('check-version FAILED\n' + errs.join('\n')); process.exit(1) }
console.log(`check-version OK (${want})`)
