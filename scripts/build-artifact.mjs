/**
 * Inline the Vite build into one HTML fragment for publishing as an Artifact.
 * The artifact host supplies <!doctype>, <head> and <body>, and its CSP only
 * admits scripts from a short CDN allowlist — so the bundle has to ship inline.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const assets = readdirSync(join(dist, 'assets'))
const cssFile = assets.find((f) => f.endsWith('.css'))
const jsFile = assets.find((f) => f.endsWith('.js'))
if (!cssFile || !jsFile) throw new Error('run `npm run build` first')

const css = readFileSync(join(dist, 'assets', cssFile), 'utf8')
const js = readFileSync(join(dist, 'assets', jsFile), 'utf8')

const out = `<title>Perio Chart Workstation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<style>
${css}
</style>

<div id="root"></div>

<script type="module">
${js}
</script>
`

mkdirSync('artifact', { recursive: true })
writeFileSync('artifact/perio-chart.html', out)
console.log(`artifact/perio-chart.html  ${(out.length / 1024).toFixed(0)} kB`)
