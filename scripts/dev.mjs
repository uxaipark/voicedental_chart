/** Run the API and the Vite dev server together, and stop both on Ctrl-C. */
import { spawn } from 'node:child_process'

const procs = [
  spawn(process.execPath, ['server/index.mjs'], { stdio: 'inherit' }),
  spawn('npx', ['vite'], { stdio: 'inherit' }),
]
const stop = () => { for (const p of procs) p.kill('SIGTERM') }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
for (const p of procs) p.on('exit', (code) => { stop(); process.exit(code ?? 0) })
