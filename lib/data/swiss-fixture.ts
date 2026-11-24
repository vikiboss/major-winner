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
import type { Match, SwissMatch, SwissResult } from '@/types'

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
  /**
   * 对局是否来自真实赛程（`SwissStage.matches`）。
   *
   * `false` 表示只有战绩分组、没有对阵明细，`matches` 里是「能确定的那几场」，
   * 不能当作完整赛程展示。
   */
  explicit: boolean
}

/**
 * 反推某阶段已结束的对局。
 *
 * 登记的只有战绩分组，**不含具体对阵**，所以同一份战绩往往对应多种可能的排法。
 * 这里逐轮求解并核对：
 *
 * - 所有解都一致认为某场该由谁赢 → 作为真实结果锁定；
 * - 多个解给出不同对阵 / 不同胜者 → 无从判断，不锁定，交给推演。
 *
 * 这样不会把「其实没打过的对阵」当成真实赛果展示出来。
 *
 * @param teamIds 参赛队伍，顺序即种子序（与 events.json 的 `stage.teams` 一致）
 * @param result  该阶段登记的 `result`
 */
export function deriveSwissFixture(
  teamIds: string[],
  result?: SwissResult,
  /** 真实对局明细（可选）。有它就不需要靠战绩去猜对阵了 */
  explicitMatches?: SwissMatch[],
): StageFixture {
  if (explicitMatches?.length) return useExplicit(explicitMatches)

  const target = getStageRecords(result)
  if (!Object.keys(target).length)
    return { matches: [], rounds: 0, consistent: true, explicit: false }

  const solutions = solveAll(teamIds, target)
  if (!solutions.length) return { matches: [], rounds: 0, consistent: false, explicit: false }

  const rounds = Math.max(...solutions.map((solution) => solution.rounds))
  const agreed = intersectSolutions(solutions.filter((solution) => solution.rounds === rounds))

  return {
    matches: agreed.map((match, index) => toMatch(match, index)),
    rounds,
    consistent: true,
    explicit: false,
  }
}

/** 一轮的对局数（16 队瑞士轮） */
const MATCHES_PER_ROUND = 8

/**
 * 直接采用真实赛程。
 *
 * `[胜者, 败者]` 的顺序就是比赛顺序，所以第 index 场的轮次可以直接除出来，
 * 不需要额外记轮次字段。
 */
function useExplicit(matches: SwissMatch[]): StageFixture {
  const derived = matches.map(([winner, loser], index): Match => ({
    id: `stage-match-${index + 1}`,
    start: '',
    no: index + 1,
    round: Math.floor(index / MATCHES_PER_ROUND) + 1,
    format: 'bo1',
    teamA: winner,
    teamB: loser,
    winner,
  }))

  const rounds = Math.ceil(matches.length / MATCHES_PER_ROUND)
  return { matches: derived, rounds, consistent: true, explicit: true }
}

/**
 * 多个解的交集：某项对阵（按「双方 + 轮次」认）在所有解里都存在、且胜者一致，才算确定。
 *
 * 同一对队伍的比赛只在轮次与胜者都相同时视为一致，避免把不同轮次的对局混在一起。
 */
function intersectSolutions(solutions: Solution[]): BracketMatch[] {
  if (!solutions.length) return []
  if (solutions.length === 1) return solutions[0].matches

  const [first, ...rest] = solutions
  const keys = rest.map((solution) => new Map(solution.matches.map((match) => [key(match), match])))

  return first.matches.filter((match) =>
    keys.every((other) => other.get(key(match))?.winner === match.winner),
  )
}

/** 一场对局的唯一键：轮次 + 双方（顺序无关） */
function key(match: BracketMatch): string {
  return `${match.round}|${[match.a, match.b].toSorted().join('|')}`
}

interface Solution {
  matches: BracketMatch[]
  /** 覆盖到第几轮 */
  rounds: number
}

/** 搜索深度上限（瑞士轮共 5 轮） */
const MAX_ROUNDS = 5

/**
 * 找出所有「打完 N 轮后战绩恰好等于登记战绩」的胜负安排，N 取能对上的最大值。
 *
 * 剪枝：某条分支里已有队伍胜场超过登记值 → 不可能是真实剧本，直接放弃
 * （5 轮全枚举是 2^40，不剪枝会跑不完）。
 * 只保留最深一层的解：浅一层的解都被深一层的「截断版」包含，没必要混在一起比。
 */
function solveAll(teamIds: string[], target: Record<string, TeamRecord>): Solution[] {
  const matchesTarget = (state: BracketState) =>
    Object.entries(target).every(([id, record]) => state.teams[id]?.wins === record.wins)

  const overshoot = (state: BracketState) =>
    Object.entries(state.teams).some(
      ([id, team]) => target[id] !== undefined && team.wins > target[id].wins,
    )

  let best: Solution[] = []
  let bestRounds = 0

  const walk = (state: BracketState, round: number, acc: BracketMatch[]) => {
    if (matchesTarget(state)) {
      const rounds = round - 1
      if (rounds > bestRounds) {
        best = [{ matches: acc, rounds }]
        bestRounds = rounds
      } else if (rounds === bestRounds) {
        best.push({ matches: acc, rounds })
      }
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

      walk(next, round + 1, [...acc, ...played])
    }
  }

  walk(createBracket(teamIds), 1, [])
  return best
}

/** 把一轮的胜负落到棋盘上（不重算配对，用于搜索下一轮） */
function applyRound(state: BracketState, played: BracketMatch[]): BracketState {
  const teams = Object.fromEntries(Object.values(state.teams).map((team) => [team.id, { ...team }]))

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
