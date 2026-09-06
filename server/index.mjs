import { createServer } from 'node:http'
import { appendEdits, commitExam, listExams, loadDraft, readEdits, readExam, saveDraft, stats, DB_PATH } from './db.mjs'

const PORT = Number(process.env.PERIO_PORT ?? 5181)
const MAX_BODY = 8 * 1024 * 1024 // a full 32-tooth draft is ~60 kB; this is room to spare

const json = (res, code, body) => {
  const text = JSON.stringify(body)
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,PUT,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  })
  res.end(text)
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) { reject(new Error('payload too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch (e) { reject(e) }
    })
    req.on('error', reject)
  })

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {})
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname
  const seg = path.split('/').filter(Boolean) // ['api', ...]

  try {
    if (path === '/api/health') return json(res, 200, { ok: true, ...stats() })

    if (seg[1] === 'draft' && seg[2]) {
      const key = decodeURIComponent(seg[2])
      if (req.method === 'GET') {
        const draft = loadDraft(key)
        return draft ? json(res, 200, draft) : json(res, 404, { error: 'no draft' })
      }
      if (req.method === 'PUT') return json(res, 200, saveDraft(key, await readBody(req)))
    }

    if (seg[1] === 'edits' && seg[2]) {
      const key = decodeURIComponent(seg[2])
      if (req.method === 'POST') {
        const { entries = [] } = await readBody(req)
        return json(res, 200, appendEdits(key, entries))
      }
      if (req.method === 'GET') {
        return json(res, 200, { entries: readEdits(key, Number(url.searchParams.get('after') ?? 0)) })
      }
    }

    if (seg[1] === 'exams') {
      if (req.method === 'POST' && !seg[2]) return json(res, 201, commitExam(await readBody(req)))
      if (req.method === 'GET' && !seg[2]) return json(res, 200, { exams: listExams(url.searchParams.get('chart')) })
      if (req.method === 'GET' && seg[2]) {
        const exam = readExam(Number(seg[2]))
        return exam ? json(res, 200, exam) : json(res, 404, { error: 'no exam' })
      }
    }

    json(res, 404, { error: 'not found' })
  } catch (err) {
    json(res, 500, { error: String(err?.message ?? err) })
  }
})

server.listen(PORT, () => {
  console.log(`perio api   http://localhost:${PORT}`)
  console.log(`sqlite      ${DB_PATH}`)
})
