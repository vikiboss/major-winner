#!/usr/bin/env node
/**
 * 本地数据台服务。
 *
 * 零依赖，只做三件事：
 *  1. 读取 data/ 下的 events / predictors / teams / predictions
 *  2. 把编辑结果写回 JSON（写前走 prettier，保持仓库格式）
 *  3. 托管 tools/studio 下的静态页面
 *
 * 用法：pnpm studio  →  http://127.0.0.1:4310
 */

import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = normalize(join(HERE, '../..'))
const DATA_DIR = join(ROOT, 'data')
const PREDICTIONS_DIR = join(DATA_DIR, 'predictions')
const STUDIO_DIR = join(ROOT, 'tools/studio')
const PRETTIER_BIN = join(ROOT, 'node_modules/.bin/prettier')

const PORT = Number(process.env.PORT ?? 4310)
const ID_PATTERN = /^[\w.-]+$/

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
}

/* -------------------------------------------------------------------------- */
/*                                  文件读写                                   */
/* -------------------------------------------------------------------------- */

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

async function writeJson(file, value) {
  const tmp = `${file}.tmp-${process.pid}`
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(tmp, file)
  await format(file)
}

/** 内容没变化就不落盘，避免无意义的格式重排 */
async function writeJsonIfChanged(file, value) {
  if (existsSync(file)) {
    const existing = await readJson(file)
    if (JSON.stringify(existing) === JSON.stringify(value)) return false
  }
  await writeJson(file, value)
  return true
}

/** 用仓库里的 prettier 统一格式，避免手动编辑产生格式噪音 */
async function format(file) {
  if (!existsSync(PRETTIER_BIN)) return
  await execFileAsync(PRETTIER_BIN, ['--write', file]).catch(() => {})
}

async function loadPredictionFiles() {
  const files = (await readdir(PREDICTIONS_DIR)).filter((file) => file.endsWith('.json'))
  const map = {}

  for (const file of files) {
    const content = await readJson(join(PREDICTIONS_DIR, file))
    if (content?.id) map[content.id] = content
  }

  return map
}

async function loadAll() {
  const [events, predictors, teams, predictions] = await Promise.all([
    readJson(join(DATA_DIR, 'events.json')),
    readJson(join(DATA_DIR, 'predictors.json')),
    readJson(join(DATA_DIR, 'teams.json')),
    loadPredictionFiles(),
  ])

  return { events, predictors, teams, predictions }
}

/* -------------------------------------------------------------------------- */
/*                                  校验                                       */
/* -------------------------------------------------------------------------- */

function validatePredictors(list) {
  if (!Array.isArray(list)) throw new Error('predictors 必须是数组')

  const ids = new Set()
  for (const item of list) {
    if (!item?.id || !ID_PATTERN.test(item.id)) throw new Error(`非法 id: ${item?.id}`)
    if (ids.has(item.id)) throw new Error(`id 重复: ${item.id}`)
    ids.add(item.id)
    if (!item.name?.trim()) throw new Error(`${item.id} 缺少 name`)
  }
}

function validatePredictionFile(file, eventId) {
  if (!file || file.id !== eventId) throw new Error('竞猜文件 id 与赛事不匹配')
  if (!Array.isArray(file.predictions)) throw new Error('predictions 必须是数组')
}

const SWISS_RESULT_KEYS = ['1-0', '0-1', '1-1', '2-0', '0-2', '2-1', '1-2', '2-2', '3-0', '3-1', '3-2', '2-3', '1-3', '0-3']

function validateEvents(events) {
  if (!Array.isArray(events)) throw new Error('events 必须是数组')

  const ids = new Set()
  for (const event of events) {
    if (!event?.id || !ID_PATTERN.test(event.id)) throw new Error(`非法赛事 id: ${event?.id}`)
    if (ids.has(event.id)) throw new Error(`赛事 id 重复: ${event.id}`)
    ids.add(event.id)

    if (!event.name?.trim() || !event.shortName?.trim()) throw new Error(`${event.id} 缺少名称`)
    if (!Array.isArray(event.teams)) throw new Error(`${event.id} 缺少 teams`)

    for (const stageId of ['stage-1', 'stage-2', 'stage-3']) {
      const stage = event[stageId]
      if (!stage || !Array.isArray(stage.teams) || !stage.result) {
        throw new Error(`${event.id} 的 ${stageId} 结构不完整`)
      }
      for (const key of SWISS_RESULT_KEYS) {
        if (!Array.isArray(stage.result[key])) throw new Error(`${event.id} ${stageId} 缺少 ${key}`)
      }
    }

    const playoffs = event.playoffs
    if (!playoffs || !Array.isArray(playoffs.teams) || !playoffs.result) {
      throw new Error(`${event.id} 缺少 playoffs`)
    }
    for (const round of ['8-to-4', '4-to-2']) {
      if (!Array.isArray(playoffs.result[round]?.winners)) {
        throw new Error(`${event.id} playoffs 缺少 ${round}`)
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                  接口                                       */
/* -------------------------------------------------------------------------- */

function validateTeams(teams) {
  if (!Array.isArray(teams)) throw new Error('teams 必须是数组')

  const ids = new Set()
  for (const team of teams) {
    if (!team?.id || !ID_PATTERN.test(team.id)) throw new Error(`非法队伍 id: ${team?.id}`)
    if (ids.has(team.id)) throw new Error(`队伍 id 重复: ${team.id}`)
    ids.add(team.id)
    if (!team.name?.trim()) throw new Error(`${team.id} 缺少 name`)
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0

    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 8 * 1024 * 1024) {
        reject(new Error('请求体过大'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null)
      } catch {
        reject(new Error('请求体不是合法 JSON'))
      }
    })

    req.on('error', reject)
  })
}

/** 竞猜文件只存 id 与竞猜内容；昵称统一由 predictors.json 提供 */
function stripNames(file) {
  file.predictions = file.predictions.map((entry) => {
    const { name, ...rest } = entry
    return rest
  })
  return file
}

async function handleApi(req, res, url) {
  const { pathname } = url

  if (req.method === 'GET' && pathname === '/api/data') {
    return sendJson(res, 200, await loadAll())
  }

  if (req.method === 'PUT' && pathname === '/api/events') {
    const { events } = await readBody(req)
    validateEvents(events)
    await writeJsonIfChanged(join(DATA_DIR, 'events.json'), events)

    // 新赛事自动补一个空的竞猜文件，省得手动建
    for (const event of events) {
      const file = join(PREDICTIONS_DIR, `${event.id}.json`)
      if (!existsSync(file)) {
        await writeJson(file, { id: event.id, predictions: [] })
      }
    }

    return sendJson(res, 200, { ok: true })
  }

  if (req.method === 'PUT' && pathname === '/api/teams') {
    const { teams } = await readBody(req)
    validateTeams(teams)
    await writeJsonIfChanged(join(DATA_DIR, 'teams.json'), teams)
    return sendJson(res, 200, { ok: true })
  }

  if (req.method === 'PUT' && pathname === '/api/predictors') {
    const list = await readBody(req)
    validatePredictors(list)
    await writeJsonIfChanged(join(DATA_DIR, 'predictors.json'), list)
    return sendJson(res, 200, { ok: true })
  }

  if (req.method === 'POST' && pathname === '/api/predictors/delete') {
    const { id } = await readBody(req)
    if (!id || !ID_PATTERN.test(id)) throw new Error('非法 id')

    const predictors = (await readJson(join(DATA_DIR, 'predictors.json'))).filter(
      (item) => item.id !== id,
    )
    await writeJson(join(DATA_DIR, 'predictors.json'), predictors)

    const predictions = await loadPredictionFiles()
    for (const [eventId, file] of Object.entries(predictions)) {
      const next = file.predictions.filter((entry) => entry.id !== id)
      if (next.length !== file.predictions.length) {
        file.predictions = next
        await writeJson(join(PREDICTIONS_DIR, `${eventId}.json`), file)
      }
    }

    return sendJson(res, 200, { ok: true, predictors, predictions })
  }

  const predictionMatch = pathname.match(/^\/api\/predictions\/([\w.-]+)$/)
  if (req.method === 'PUT' && predictionMatch) {
    const eventId = predictionMatch[1]
    const file = await readBody(req)
    validatePredictionFile(file, eventId)
    await writeJsonIfChanged(join(PREDICTIONS_DIR, `${eventId}.json`), stripNames(file))
    return sendJson(res, 200, { ok: true })
  }

  return sendJson(res, 404, { error: '未知接口' })
}

/* -------------------------------------------------------------------------- */
/*                                  静态文件                                   */
/* -------------------------------------------------------------------------- */

async function serveStatic(res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '')
  const file = join(STUDIO_DIR, relative)

  if (!file.startsWith(STUDIO_DIR)) {
    res.writeHead(403).end('forbidden')
    return
  }

  try {
    const content = await readFile(file)
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    res.end(content)
  } catch {
    res.writeHead(404).end('not found')
  }
}

/* -------------------------------------------------------------------------- */
/*                                  启动                                       */
/* -------------------------------------------------------------------------- */

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url)
      return
    }
    await serveStatic(res, url.pathname)
  } catch (error) {
    sendJson(res, 400, { error: error.message })
  }
})

function listen(port, remaining = 10) {
  const onError = (error) => {
    server.off('listening', onListening)

    if (error.code === 'EADDRINUSE' && remaining > 0) {
      server.off('error', onError)
      listen(port + 1, remaining - 1)
      return
    }

    console.error(`\n  启动失败：${error.message}\n`)
    process.exit(1)
  }

  const onListening = () => {
    server.off('error', onError)
    console.log(`  数据台已启动  http://127.0.0.1:${port}`)
    console.log(`  数据目录      ${DATA_DIR}`)
    console.log('  改动会直接写回 JSON，建议先 git commit 一次\n')
  }

  server.once('error', onError)
  server.once('listening', onListening)
  server.listen(port, '127.0.0.1')
}

listen(PORT)
