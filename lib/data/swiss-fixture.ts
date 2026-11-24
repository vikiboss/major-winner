/**
 * 把 `data/events.json` 里登记的**战绩分组**还原成「已结束的对局」。
 *
 * events.json 只维护每个战绩组里有谁（如 `2-0: ["NIP", …]`），不记具体比分与互相对阵。
 * 推演页需要真实结果来锁定对局，所以这里按瑞士轮规则反推：
 *
 * 1. 第 1 轮按官方赛制——种子序切两半、同位对位（1 对 9、2 对 10 …）。
 * 2. 之后每轮用与推演一致的规则（Buchholz 降序 + 种子升序、首尾配对、规避重赛）生成配对，
 *    再枚举每场胜负，只保留「所有队伍战绩恰好等于登记战绩」的那组结果。
 * 3. 有多个解时优先「按种子强弱」的那个，与推演默认剧本一致，改起来最顺手。
 *
 * 战绩通常只覆盖到某一轮，所以能确定到哪一轮就锁到哪一轮，其余留给推演。
 * 一轮只打了一半时，剩余场次不在解里，同样交给推演。
 *
 * 这里只放纯函数，页面请通过 `lib/data` 的导出使用。
 */

import { buildRound, createBracket, seedBracket, settleBracket } from './swiss-bracket'
import { parseRecord } from './swiss'

import type { BracketMatch, BracketState } from './swiss-bracket'
import type { TeamRecord } from './swiss'
import type { Match, SwissResult } from '@/types'

/* -------------------------------------------------------------------------- */
/*                                 战绩收录                                   */
/* -------------------------------------------------------------------------- */

/** 由 `result` 反推每支队伍的当前战绩（进行中 / 已定稿的记录都收） */
export function getStageRecords(result?: SwissResult): Record<string, TeamRecord> {
  const records: Record<string, TeamRecord> = {}
  if (!result) return records

  for (const [record, teams] of Object.entries(result)) {
    if (!/^\d-\d$/.test(record)) continue
    const parsed = parseRecord(record)
    for (const team of teams ?? []) records[team] = parsed
  }

  return records
}

/* -------------------------------------------------------------------------- */
/*                                 反推对局                                   */
/* -------------------------------------------------------------------------- */

/** 反推结果 */
export interface StageFixture {
  /** 已结束的对局（可直接喂给 `seedBracket`） */
  matches: Match[]
  /** 还原到的轮次（之后的对局交给推演；0 表示还没有真实结果） */
  rounds: number
  /** 登记的战绩能否被规则推导出（false 表示数据可能录错或赛制有出入） */
  consistent: boolean
}

/**
 * 反推某阶段已结束的对局。
 *
 * @param teamIds 参赛队伍，顺序即种子序（与 events.json 的 `stage.teams` 一致）
 * @param result  该阶段登记的 `result`
 */
export function deriveSwissFixture(teamIds: string[], result?: SwissResult): StageFixture {
  const target = getStageRecords(result)
  if (!Object.keys(target).length) return { matches: [], rounds: 0, consistent: true }

  const solution = solve(teamIds, target)
  if (!solution || solution.rounds === 0) return { matches: [], rounds: 0, consistent: false }

  return {
    matches: solution.matches.map((match, index) => toMatch(match, index)),
    rounds: solution.rounds,
    consistent: true,
  }
}

interface Solution {
  matches: BracketMatch[]
  /** 与默认剧本不一致的场次数（越小越贴近「强弱」直觉） */
  deviation: number
  /** 覆盖到第几轮 */
  rounds: number
}

/** 搜索深度上限（瑞士轮共 5 轮） */
const MAX_ROUNDS = 5

/**
 * 找出「打完 N 轮后战绩恰好等于登记战绩」的胜负安排，N 取能对上的最大值。
 *
 * 顺带剪枝：某个分支里已经有队伍胜场超过登记值，就说明这条路不可能是真实剧本，
 * 直接放弃——它只会让搜索树爆炸（5 轮全枚举是 2^40）。
 * 16 队一轮 8 场、每场两种结果，加上剪枝后实际只展开到真实结果覆盖的轮次。
 */
function solve(teamIds: string[], target: Record<string, TeamRecord>): Solution | null {
  const matchesTarget = (state: BracketState) =>
    Object.entries(target).every(([id, record]) => state.teams[id]?.wins === record.wins)

  const overshoot = (state: BracketState) =>
    Object.entries(state.teams).some(
      ([id, team]) => target[id] !== undefined && team.wins > target[id].wins,
    )

  let best: Solution | null = null

  const walk = (state: BracketState, round: number, acc: BracketMatch[], deviation: number) => {
    if (matchesTarget(state)) {
      const better =
        !best || round - 1 > best.rounds || (round - 1 === best.rounds && deviation < best.deviation)
      if (better) best = { matches: acc, deviation, rounds: round - 1 }
    }

    if (round > MAX_ROUNDS) return

    const fixtures = buildRound(state, round)
    if (!fixtures.length) return

    for (let mask = 0; mask < 1 << fixtures.length; mask++) {
      const played = fixtures.map((match, index) => ({
        ...match,
        winner: (mask >> index) & 1 ? match.b : match.a,
      }))
      const next = applyRound(state, played)
      if (overshoot(next)) continue

      const off = played.filter((match) => match.winner !== defaultWinner(state, match)).length
      walk(next, round + 1, [...acc, ...played], deviation + off)
    }
  }

  walk(createBracket(teamIds), 1, [], 0)
  return best
}

/** 把一轮的胜负落到棋盘上（不重算配对，用于搜索下一轮） */
function applyRound(state: BracketState, played: BracketMatch[]): BracketState {
  const teams = Object.fromEntries(
    Object.values(state.teams).map((team) => [team.id, { ...team }]),
  )

  for (const match of played) {
    const winner = teams[match.winner!]
    const loser = teams[match.winner === match.a ? match.b : match.a]
    if (!winner || !loser) continue

    winner.wins++
    loser.losses++
    winner.record = `${winner.wins}-${winner.losses}`
    loser.record = `${loser.wins}-${loser.losses}`
  }

  return { teams, matches: [...state.matches, ...played] }
}

/** 默认剧本：种子数字小的（排名高）一方获胜 */
function defaultWinner(state: BracketState, match: BracketMatch): string {
  const seedA = state.teams[match.a]?.seed ?? Number.MAX_SAFE_INTEGER
  const seedB = state.teams[match.b]?.seed ?? Number.MAX_SAFE_INTEGER
  return seedA <= seedB ? match.a : match.b
}

/** 反推出的对局 → `seedBracket` 认得的赛程结构 */
function toMatch(match: BracketMatch, index: number): Match {
  const target = match.format === 'bo3' ? 2 : 1
  const won = match.winner === match.a

  return {
    id: `${match.id}-derived`,
    start: '',
    round: match.round,
    group: match.group,
    format: match.format,
    teamA: match.a,
    teamB: match.b,
    winner: match.winner,
    no: index + 1,
    score: won ? [target, target - 1] : [target - 1, target],
  }
}

/* -------------------------------------------------------------------------- */
/*                                 推演起点                                   */
/* -------------------------------------------------------------------------- */

/**
 * 由战绩生成推演起点：反推已结束的对局 → 锁定 → 其余按默认剧本补齐。
 *
 * 战绩全空（阶段还没开始）时退化为「全按默认剧本」，与之前的行为一致。
 * 返回值一定是完整可改的 33 场，且真实结果已锁定。
 */
export function buildStateFromResult(teamIds: string[], result?: SwissResult): BracketState {
  const { matches } = deriveSwissFixture(teamIds, result)
  return settleBracket(seedBracket(createBracket(teamIds), matches))
}

/**
 * 真实结果进行到第几轮（用于把面板默认定位到当前轮）。
 *
 * 已锁定场次里最靠后的轮次；没有真实结果时为 1。
 */
export function getFrontierRound(state: BracketState): number {
  const locked = state.matches.filter((match) => match.locked)
  if (!locked.length) return 1
  return Math.max(...locked.map((match) => match.round))
}
