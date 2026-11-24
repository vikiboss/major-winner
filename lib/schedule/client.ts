/**
 * 赛程页的数据获取与归一化（纯函数模块，不含 React）。
 *
 * ⚠️ 这些函数必须放在**组件文件之外**：
 * 本项目开启了 `reactCompiler.compilationMode: 'all'`，编译器会把组件文件里的函数
 * 当成组件来优化，给它们注入 `useMemoCache`（react-compiler-runtime 的 `c()`）。
 * 普通函数被注入后一旦在渲染期之外调用，就会抛 `Invalid hook call`。
 *
 * 接口约定（实测）：
 * - `matchTime` **必填**，且必须精确到秒的 `YYYY-MM-DD HH:mm:ss`；
 *   缺参数 / 缺秒 / 只有日期都会返回 `{ code: 10001, message: '参数错误' }`
 * - 按**日历日**取数：`matchTime=2026-11-24 00:00:00` 返回 11-24 全天比赛
 * - `status`：1 未开始 / 2 进行中 / 3 已结束
 * - `bo`：未结束时是 `boN`，进行中/已结束时会变成地图代码（`inf`/`nuke`…）
 */

import type { MatchFormat, ScheduleMatch } from '@/types'

/** 赛事方赛程接口 */
export const API_BASE = 'https://gwapi.pwesports.cn/eventcenter/app/csgo/event/getMatchList'

/** 自动刷新间隔（毫秒） */
export const REFRESH_MS = 60 * 1000

/** 只保留赛事名里含该关键字的场次 */
const MAJOR_KEYWORD = 'major'

/** 接口返回的最小结构（其余字段忽略） */
export interface RawApiMatch {
  id?: number
  startTime?: number
  team1DTO?: RawApiTeam | null
  team2DTO?: RawApiTeam | null
  score1?: number | null
  score2?: number | null
  bo?: string | null
  status?: number | null
  csgoEventDTO?: { name?: string | null; nameZh?: string | null } | null
}

interface RawApiTeam {
  name?: string | null
  logoWhite?: string | null
  logoBlack?: string | null
}

export interface RawApiResponse {
  code?: number
  message?: string
  result?: { matchResponse?: { dtoList?: RawApiMatch[] | null } | null } | null
}

/**
 * 日期 key → 请求地址。
 *
 * 直接用日期 key 拼 `YYYY-MM-DD 00:00:00`，**不要**经过本地时区转换：
 * 本地零点再用 `getUTC*` 格式化，在 UTC+8 会变成前一天 16:00，整天比赛都会缺失。
 */
export function buildScheduleUrl(dateKey: string): string {
  const isDateKey = /^\d{4}-\d{2}-\d{2}$/.test(dateKey)
  const day = isDateKey ? dateKey : new Date().toISOString().slice(0, 10)
  return `${API_BASE}?matchTime=${encodeURIComponent(`${day} 00:00:00`)}`
}

/* -------------------------------------------------------------------------- */
/*                                  归一化                                    */
/* -------------------------------------------------------------------------- */

/** 接口未定对阵时返回 `TBD`，统一视为「待定」 */
function teamName(team: RawApiTeam | null | undefined): string | null {
  const name = team?.name?.trim()
  if (!name || name.toUpperCase() === 'TBD') return null
  return name
}

/**
 * 赛制。
 *
 * 接口只在对局**未开始**时给 `boN`；一旦开打（进行中/已结束），`bo` 会变成地图代号
 * （`inf`/`mrg`/`nuke`…），所以不能直接读 `bo`。
 *
 * 对局已结束时的可靠判据是**比分**：接口的比分有两种形态
 * - BO1：单局局分，如 `13:5` / `16:14`，胜方 ≥ 13
 * - BO3/BO5：胜图数，如 `2:0` / `2:1`（BO5 为 `3:1`），胜方 ≤ 3
 *
 * 进行中没有最终比分，只能保守回退 BO1。
 */
export function matchFormat(
  bo: string | null | undefined,
  score1: number | null | undefined,
  score2: number | null | undefined,
): MatchFormat {
  // 1) 接口直接给了 BO 数（未开始的对局）
  const matched = bo?.match(/^bo([135])$/i)
  if (matched) return `bo${matched[1]}` as MatchFormat

  // 2) 已结束：按比分形态判断
  if (typeof score1 === 'number' && typeof score2 === 'number') {
    const winnerScore = Math.max(score1, score2)

    // 单局局分（13 / 16…）→ BO1；胜图数 3 → BO5；其余（ 2 ）→ BO3
    if (winnerScore >= 13) return 'bo1'
    if (winnerScore >= 3) return 'bo5'
    return 'bo3'
  }

  // 3) 进行中：拿不到最终比分，Major 前期全是 BO1，保守回退
  return 'bo1'
}

/**
 * 原始响应 → 赛程列表：只保留赛事名含 `Major` 的场次，去重后按开赛时间升序。
 */
export function normalizeSchedule(data: RawApiResponse | undefined): ScheduleMatch[] {
  const list = data?.result?.matchResponse?.dtoList
  if (!Array.isArray(list)) return []

  const seen = new Set<number>()
  const matches: ScheduleMatch[] = []

  for (const raw of list) {
    const { id, startTime } = raw
    if (typeof id !== 'number' || typeof startTime !== 'number' || seen.has(id)) continue

    const eventName = raw.csgoEventDTO?.name ?? ''
    if (!eventName.toLowerCase().includes(MAJOR_KEYWORD)) continue
    seen.add(id)

    const finished =
      raw.status === 3 && typeof raw.score1 === 'number' && typeof raw.score2 === 'number'

    const teamA = teamName(raw.team1DTO)
    const teamB = teamName(raw.team2DTO)

    // 队伍待定的占位对局不可能「进行中」
    const status = finished ? 'finished' : raw.status === 2 && teamA && teamB ? 'live' : 'upcoming'

    const score: [number, number] | null = finished
      ? [raw.score1 as number, raw.score2 as number]
      : null

    matches.push({
      id,
      start: startTime,
      teamA,
      teamB,
      score,
      winner:
        finished && teamA && teamB
          ? (raw.score1 as number) > (raw.score2 as number)
            ? teamA
            : teamB
          : null,
      format: matchFormat(raw.bo, score?.[0], score?.[1]),
      status,
      eventName,
      eventNameZh: raw.csgoEventDTO?.nameZh ?? eventName,
    })
  }

  return matches.toSorted((x, y) => x.start - y.start || x.id - y.id)
}
