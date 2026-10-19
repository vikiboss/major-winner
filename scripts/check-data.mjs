#!/usr/bin/env node
/**
 * 比赛数据校验脚本。
 *
 * 手动更新 data/*.json 后运行 `pnpm data:check`，
 * 提前发现队伍拼写、竞猜数量、阶段引用等常见错误。
 */

import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'data')

const SWISS_STAGES = ['stage-1', 'stage-2', 'stage-3']
const PROGRESS_RECORDS = ['1-0', '0-1', '1-1', '2-0', '0-2', '2-1', '1-2', '2-2']
const RESULT_RECORDS = ['3-0', '3-1', '3-2', '2-3', '1-3', '0-3']
const RESULT_SIZES = { '3-0': 2, '3-1': 3, '3-2': 3, '2-3': 3, '1-3': 3, '0-3': 2 }

const errors = []
const warnings = []

function fail(path, message) {
  errors.push(`${path}: ${message}`)
}

function warn(path, message) {
  warnings.push(`${path}: ${message}`)
}

async function readJson(path) {
  return JSON.parse(await readFile(join(ROOT, path), 'utf8'))
}

function duplicates(list) {
  const seen = new Set()
  return list.filter((item) => (seen.has(item) ? true : (seen.add(item), false)))
}

/* -------------------------------------------------------------------------- */
/*                                    校验                                     */
/* -------------------------------------------------------------------------- */

function validateEvent(event, teamIds, indexPath) {
  const path = `events.json[${indexPath}]`

  for (const key of ['id', 'name', 'shortName', 'current', 'teams', ...SWISS_STAGES, 'playoffs']) {
    if (event[key] === undefined) fail(path, `缺少字段 ${key}`)
  }

  const dupTeams = duplicates(event.teams.map((t) => t.id))
  if (dupTeams.length) fail(path, `teams 重复: ${dupTeams.join(', ')}`)

  for (const team of event.teams) {
    if (!teamIds.has(team.id)) fail(path, `teams 中的 ${team.id} 不在 teams.json`)
    if (!SWISS_STAGES.includes(team.stage)) fail(path, `${team.id} 的起始阶段 ${team.stage} 非法`)
  }

  const participants = {}

  for (const stageId of SWISS_STAGES) {
    const stage = event[stageId]
    if (!stage) continue

    const stagePath = `${path}.${stageId}`
    const members = new Set([...(stage.teams ?? []), ...(stage.teamsFromAdvanced ?? [])])
    participants[stageId] = members

    if (!stage.teams?.length) warn(stagePath, 'teams 为空')

    for (const team of members) {
      if (!teamIds.has(team)) fail(stagePath, `参赛队伍 ${team} 不在 teams.json`)
    }

    const result = stage.result ?? {}
    for (const record of [...PROGRESS_RECORDS, ...RESULT_RECORDS]) {
      if (!Array.isArray(result[record])) {
        fail(stagePath, `result 缺少分组 ${record}`)
        continue
      }

      const dup = duplicates(result[record])
      if (dup.length) fail(stagePath, `${record} 内队伍重复: ${dup.join(', ')}`)

      for (const team of result[record]) {
        if (!members.has(team)) fail(stagePath, `${record} 中的 ${team} 不属于本阶段`)
      }

      const expected = RESULT_SIZES[record]
      if (expected && result[record].length > 0 && result[record].length !== expected) {
        fail(stagePath, `${record} 应有 ${expected} 支队伍，实际 ${result[record].length}`)
      }
    }

    const allFinal = RESULT_RECORDS.every((r) => result[r]?.length === RESULT_SIZES[r])
    const totalFinal = RESULT_RECORDS.reduce((sum, r) => sum + (result[r]?.length ?? 0), 0)
    if (!allFinal && totalFinal > 0) {
      warn(stagePath, `最终结果不完整（已录入 ${totalFinal} 支），页面会显示为进行中`)
    }
  }

  const playoffs = event.playoffs
  if (playoffs) {
    const playoffsPath = `${path}.playoffs`
    const members = new Set(playoffs.teams ?? [])

    for (const team of members) {
      if (!teamIds.has(team)) fail(playoffsPath, `参赛队伍 ${team} 不在 teams.json`)
    }

    const result = playoffs.result ?? {}
    const round84 = result['8-to-4'] ?? { winners: [], losers: [] }
    const round42 = result['4-to-2'] ?? { winners: [], losers: [] }
    const final = result['2-to-1'] ?? { winner: null, loser: null }

    const decided84 = [...(round84.winners ?? []), ...(round84.losers ?? [])]
    if (decided84.length > 8) fail(playoffsPath, `八进四结果超过 8 支队伍`)
    for (const team of decided84) {
      if (!members.has(team)) fail(playoffsPath, `八进四结果中的 ${team} 不在 playoffs.teams`)
    }
    if (decided84.length > 0 && decided84.length !== 8) {
      warn(playoffsPath, `八进四已录入 ${decided84.length}/8 支队伍`)
    }

    for (const team of [...(round42.winners ?? []), ...(round42.losers ?? [])]) {
      if (!(round84.winners ?? []).includes(team)) {
        fail(playoffsPath, `半决赛结果中的 ${team} 未在八进四晋级名单中`)
      }
    }

    for (const team of [final.winner, final.loser].filter(Boolean)) {
      if (!(round42.winners ?? []).includes(team)) {
        fail(playoffsPath, `决赛结果中的 ${team} 未在半决赛晋级名单中`)
      }
    }
  }

  return participants
}

function validatePredictions(file, event, participants, predictorIds) {
  const path = `data/predictions/${file}`
  const seen = new Set()

  for (const [index, prediction] of (event.predictions ?? []).entries()) {
    const itemPath = `${path}#${index}(${prediction.id ?? '?'})`

    if (!prediction.id) {
      fail(itemPath, '缺少 id')
      continue
    }
    if (seen.has(prediction.id)) fail(itemPath, 'id 重复')
    seen.add(prediction.id)

    if (!predictorIds.has(prediction.id)) {
      fail(itemPath, 'id 不在 predictors.json 中（页面将缺少头像与主页链接）')
    }

    for (const stageId of SWISS_STAGES) {
      const picks = prediction[stageId]
      if (!picks) continue

      const members = participants[stageId]
      const stagePath = `${itemPath}.${stageId}`

      for (const [bucket, size] of [
        ['3-0', 2],
        ['3-X', 6],
        ['0-3', 2],
      ]) {
        const teams = picks[bucket]
        if (!Array.isArray(teams)) {
          fail(stagePath, `缺少 ${bucket}`)
          continue
        }
        if (teams.length !== size)
          fail(stagePath, `${bucket} 应有 ${size} 支队伍，实际 ${teams.length}`)

        const dup = duplicates(teams)
        if (dup.length) fail(stagePath, `${bucket} 内队伍重复: ${dup.join(', ')}`)

        for (const team of teams) {
          if (members && !members.has(team)) fail(stagePath, `${bucket} 中的 ${team} 不属于本阶段`)
        }
      }
    }

    const playoffs = prediction.playoffs
    if (playoffs) {
      const playoffsPath = `${itemPath}.playoffs`
      const members = new Set(event.playoffs?.teams ?? [])

      for (const [round, size] of [
        ['8-to-4', 4],
        ['4-to-2', 2],
      ]) {
        const teams = playoffs[round]
        if (!Array.isArray(teams)) {
          fail(playoffsPath, `缺少 ${round}`)
          continue
        }
        if (teams.length !== size)
          fail(playoffsPath, `${round} 应有 ${size} 支队伍，实际 ${teams.length}`)
        for (const team of teams) {
          if (members.size && !members.has(team))
            fail(playoffsPath, `${round} 中的 ${team} 不在 playoffs.teams`)
        }
      }

      const champion = playoffs['2-to-1']
      if (champion !== null && champion !== undefined) {
        if (typeof champion !== 'string') fail(playoffsPath, '2-to-1 应为队伍 id 或 null')
        else if (members.size && !members.has(champion)) {
          fail(playoffsPath, `冠军 ${champion} 不在 playoffs.teams`)
        }
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                    入口                                     */
/* -------------------------------------------------------------------------- */

async function main() {
  const events = await readJson('data/events.json')
  const teams = await readJson('data/teams.json')
  const predictors = await readJson('data/predictors.json')

  const teamIds = new Set(teams.map((t) => t.id))
  const predictorIds = new Set(predictors.map((p) => p.id))
  const eventMap = new Map()

  const dupEventIds = duplicates(events.map((e) => e.id))
  if (dupEventIds.length) fail('events.json', `赛事 id 重复: ${dupEventIds.join(', ')}`)

  for (const [index, event] of events.entries()) {
    const participants = validateEvent(event, teamIds, index)
    eventMap.set(event.id, { event, participants })
  }

  const files = (await readdir(join(DATA, 'predictions'))).filter((f) => f.endsWith('.json'))

  for (const file of files) {
    const data = await readJson(join('data/predictions', file))
    const entry = eventMap.get(data.id)

    if (!entry) {
      fail(`data/predictions/${file}`, `id "${data.id}" 在 events.json 中不存在`)
      continue
    }

    validatePredictions(file, data, entry.participants, predictorIds)
  }

  for (const id of eventMap.keys()) {
    const hasFile = await Promise.all(
      files.map(async (file) => (await readJson(join('data/predictions', file))).id === id),
    )
    if (!hasFile.some(Boolean)) warn('data/predictions', `赛事 ${id} 没有竞猜文件`)
  }

  for (const warning of warnings) console.warn(`⚠️  ${warning}`)

  if (errors.length) {
    console.error(`\n❌ 发现 ${errors.length} 个数据问题：`)
    for (const error of errors) console.error(`   ${error}`)
    process.exit(1)
  }

  console.log(
    `✅ 数据校验通过：${events.length} 个赛事、${files.length} 份竞猜、${teams.length} 支队伍`,
  )
  if (warnings.length) console.log(`   （${warnings.length} 条提醒，不影响构建）`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
