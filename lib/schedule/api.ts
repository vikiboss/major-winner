/**
 * 赛程数据源：直接请求完美世界赛事接口（`getMatchList`）。
 *
 * 数据不再落到 `data/events.json`，页面拿到当天列表后在客户端按日期筛选，
 * 这里只负责「取某一时间点之后的对局」+ 归一化成 `ScheduleMatch`。
 *
 * 接口说明（实测）：
 * - `matchTime` 形如 `2026-11-24 00:00:00`，返回该时间之后的一批对局（跨赛事）
 * - `status`：1 未开始 / 2 进行中 / 3 已结束
 * - `bo`：未结束时是 `bo1`/`bo3`/`bo5`，进行中或已结束时会变成地图代码（`inf`/`nuke`…），
 *   所以赛制优先看 `boN`，否则按赛制推断（Major 瑞士轮前两轮 BO1，其余 BO3）
 */

import { isInProgress, isMajorLevel, matchFormat, normalizeSchedule } from './client'

import type { MatchStatus, ScheduleMatch } from '@/types'

const API_BASE = 'https://gwapi.pwesports.cn/eventcenter/app/csgo/event/getMatchList'

/** 单场对局需要的字段（接口返回的其他字段一律忽略） */
interface ApiTeam {
  name?: string | null
  logoWhite?: string | null
  logoBlack?: string | null
}

interface ApiMatch {
  id?: number
  startTime?: number
  team1DTO?: ApiTeam | null
  team2DTO?: ApiTeam | null
  score1?: number | null
  score2?: number | null
  bo?: string | null
  status?: number | null
  star?: number | null
  csgoEventDTO?: { name?: string | null; nameZh?: string | null; level?: string | null } | null
}

interface ApiResponse {
  code?: number
  result?: { matchResponse?: { dtoList?: ApiMatch[] | null } | null } | null
}

/* -------------------------------------------------------------------------- */
/*                                  归一化                                    */
/* -------------------------------------------------------------------------- */

/** 队名：接口未定对阵时返回 `TBD`，统一视为「待定」 */
function toTeamName(team: ApiTeam | null | undefined): string | null {
  const name = team?.name?.trim()
  if (!name || name.toUpperCase() === 'TBD') return null
  return name
}

/** 单条接口数据 → 视图模型；不合法（没 id / 没时间 / 赛事等级不是 Major）返回 null */
function toScheduleMatch(raw: ApiMatch): ScheduleMatch | null {
  const { id, startTime } = raw
  if (typeof id !== 'number' || typeof startTime !== 'number') return null

  if (!isMajorLevel(raw.csgoEventDTO?.level)) return null

  const eventName = raw.csgoEventDTO?.name ?? ''

  const hasScore =
    raw.status === 3 && typeof raw.score1 === 'number' && typeof raw.score2 === 'number'

  const teamA = toTeamName(raw.team1DTO)
  const teamB = toTeamName(raw.team2DTO)

  // 已结束 → 已结束；队伍未定 → 未开始；否则按开赛时间判断是否进行中（接口 status 会滞后）
  const status: MatchStatus = hasScore
    ? 'finished'
    : teamA && teamB && isInProgress(raw)
      ? 'live'
      : 'upcoming'

  const winner =
    hasScore && teamA && teamB
      ? (raw.score1 as number) > (raw.score2 as number)
        ? teamA
        : teamB
      : null

  return {
    id,
    start: startTime,
    teamA,
    teamB,
    score: hasScore ? [raw.score1 as number, raw.score2 as number] : null,
    winner,
    format: matchFormat(
      raw.bo,
      hasScore ? (raw.score1 as number) : null,
      hasScore ? (raw.score2 as number) : null,
    ),
    status,
    eventName,
    eventNameZh: raw.csgoEventDTO?.nameZh ?? eventName,
    star: typeof raw.star === 'number' ? raw.star : null,
  }
}

/** 批量归一化：过滤非 Major（按赛事等级）、去重、按开赛时间升序 */
export function normalizeMatchList(list: ApiMatch[] | null | undefined): ScheduleMatch[] {
  if (!list) return []

  const seen = new Set<number>()
  const matches: ScheduleMatch[] = []

  for (const raw of list) {
    const match = toScheduleMatch(raw)
    if (!match || seen.has(match.id)) continue
    seen.add(match.id)
    matches.push(match)
  }

  return matches.sort((x, y) => x.start - y.start || x.id - y.id)
}

/* -------------------------------------------------------------------------- */
/*                                  请求                                       */
/* -------------------------------------------------------------------------- */

/** `Date` → 接口需要的 `YYYY-MM-DD HH:mm:ss`（按 UTC 取，与接口的分界一致） */
export function toMatchTimeParam(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  )
}

/** 首次加载往前多取一天，方便切换到「上一日」时不必再请求 */
const FETCH_BACK_MS = 24 * 60 * 60 * 1000

/**
 * 拉取赛程。
 *
 * @param from 起点（含），向前多取一天兜底
 */
export async function fetchScheduleMatches(from: Date = new Date()): Promise<ScheduleMatch[]> {
  const start = new Date(from.getTime() - FETCH_BACK_MS)
  const url = `${API_BASE}?matchTime=${encodeURIComponent(toMatchTimeParam(start))}`

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`赛程接口请求失败：HTTP ${response.status}`)
  }

  const data = (await response.json()) as ApiResponse
  return normalizeMatchList(data.result?.matchResponse?.dtoList)
}

/** 对外暴露的原始响应类型，供后续扩展（如比分轮询）使用 */
export type { ApiMatch }
