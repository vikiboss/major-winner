/**
 * CS2 Major 瑞士轮规则：对手配对 + 赛事推演。
 *
 * 规则来源（Valve / HLTV 通行做法），实现时按顺序应用：
 *
 * 1. 同战绩交手：0-0 打 0-0，1-0 打 1-0，0-1 打 0-1……三胜晋级、三负淘汰。
 * 2. 组内按 Buchholz 分排序：分数 = 本队所有对手的净胜场（胜 − 负）之和。
 * 3. 首尾配对（fold）：组内第 1 名对最后 1 名，第 2 名对倒数第 2 名……
 * 4. 重赛规避：首尾配对出现打过的组合时，保持排名靠前那队不动，
 *    把靠后那队向下滑动找没打过的对手；实在无解才回退（并打上 `rematch` 标记）。
 * 5. 晋/淘汰局 bo3：2-x 组（含 2-0、2-2）与 0-2 组一律 bo3，其余 bo1。
 * 6. 平手决胜：同分且同「初始 Buchholz」时，用初始种子（号码小的优先）打破平局。
 *
 * 这里只放纯函数，页面请通过 `lib/data` 的导出来用。
 */

import { SWISS_RESULT_RECORDS } from '@/lib/constants'

import type {
  MatchFormat,
  MatchStatus,
  SimulationTeam,
  SwissProgressRecord,
  SwissResultRecord,
  SwissSimulation,
  SwissStageType,
} from '@/types'

/* -------------------------------------------------------------------------- */
/*                                  战绩                                       */
/* -------------------------------------------------------------------------- */

/** 0/1/2/3 胜，0/1/2/3 负 */
export interface TeamRecord {
  wins: number
  losses: number
}

/** `2-1` → `{ wins: 2, losses: 1 }` */
export function parseRecord(record: string): TeamRecord {
  const [wins, losses] = record.split('-').map(Number)
  return { wins: wins ?? 0, losses: losses ?? 0 }
}

/** `{ wins: 2, losses: 1 }` → `2-1` */
export function formatRecord({ wins, losses }: TeamRecord): string {
  return `${wins}-${losses}`
}

/** 瑞士轮结束条件：三胜或三负 */
export function isRecordDecided({ wins, losses }: TeamRecord): boolean {
  return wins >= 3 || losses >= 3
}

/** 由战绩直接得到最终分组（3-0 / 3-1 / 3-2 / 2-3 / 1-3 / 0-3） */
export function toResultRecord({ wins, losses }: TeamRecord): SwissResultRecord {
  return `${wins}-${losses}` as SwissResultRecord
}

/* -------------------------------------------------------------------------- */
/*                                  赛制                                       */
/* -------------------------------------------------------------------------- */

/**
 * 对局赛制。
 * - 2-x 组（2-0 / 2-1 / 2-2）：胜者拿到 3 胜晋级 → bo3
 * - 0-2 组：败者拿到 3 负淘汰 → bo3
 * - 其余（0-0、1-0、0-1、1-1、1-2）为 bo1
 *
 * 注意：1-2 组是 bo1，只有 0-2 与 2-x 才打 bo3。
 */
export function getMatchFormat(record: TeamRecord): MatchFormat {
  if (record.wins === 2 || (record.wins === 0 && record.losses === 2)) return 'bo3'
  return 'bo1'
}

/** 该组本轮是否会产生晋级（2-x）或淘汰（0-2） */
export function isDecidingGroup(record: TeamRecord): boolean {
  return getMatchFormat(record) === 'bo3'
}

/** 赢下多少局获胜（BO1 取 1、BO3 取 2、BO5 取 3） */
export function winsNeeded(format: MatchFormat): number {
  return Math.ceil(Number(format.replace('bo', '')) / 2)
}

/**
 * 根据比分与赛制推导对局状态。
 *
 * - `score` 为空：未开始
 * - 任一方达到赛制所需局数：已结束
 * - 其余（有比分但未分出胜负）：进行中
 */
export function getMatchStatus(format: MatchFormat, score?: [number, number] | null): MatchStatus {
  if (!score) return 'upcoming'

  const target = winsNeeded(format)
  if (score[0] >= target || score[1] >= target) return 'finished'

  return 'live'
}

/* -------------------------------------------------------------------------- */
/*                                 配对引擎                                    */
/* -------------------------------------------------------------------------- */

/** 配对输入：一支队伍的当前状态 */
export interface PairingTeam {
  id: string
  /** 当前战绩 */
  record: string
  /** 初始种子（1 起，越小越强） */
  seed: number
}

/** 已经交手过的对手（用于重赛检测） */
export type MatchHistory = Record<string, string[]>

/** 配对结果：一个战绩组内的一组对阵 */
export interface PairingGroup {
  /** 战绩组，如 1-0 */
  record: string
  /** 组内排序（Buchholz 降序，同分按种子），每项带 Buchholz 分 */
  standings: { id: string; buchholz: number; seed: number }[]
  /** 首尾配对得到的对阵（顺序同 standings 的前半段） */
  pairs: [string, string][]
  /** 因重赛规避被调整过的对阵数量 */
  adjusted: number
  /** 同组内所有可选对手都打过、只能重赛的对阵 */
  rematches: [string, string][]
}

export interface PairingResult {
  groups: PairingGroup[]
}

/**
 * Buchholz 分：本队所有对手的净胜场（胜 − 负）之和。
 *
 * 用净胜场而不是单纯胜场，能让「对手也曾输过」和「对手全胜」区分开，
 * 与 Valve / majors.im 的 SwissBuchholtzMajorOptimized 一致。
 * 对手尚未产生（未来轮次）时不计。
 */
export function buchholzScore(
  team: string,
  history: MatchHistory,
  records: Map<string, TeamRecord>,
) {
  const opponents = history[team] ?? []
  return opponents.reduce(
    (sum, opponent) =>
      sum + (records.get(opponent)?.wins ?? 0) - (records.get(opponent)?.losses ?? 0),
    0,
  )
}

/** 排名：Buchholz 高的在前；同分时初始种子小的（更强的）在前 */
function compareStanding(
  a: { id: string; buchholz: number; seed: number },
  b: { id: string; buchholz: number; seed: number },
) {
  return b.buchholz - a.buchholz || a.seed - b.seed
}

/**
 * 首尾配对 + 重赛规避。
 *
 * 做法：把排好序的队伍拆成「上半区」和「下半区」（下半区倒序），逐个配。
 * 当前面对的下半区对手打过时，在剩余的下半区里往后找第一个没打过的；
 * 全部打过则退回原本的首尾配对，并把该场标记为 rematch。
 *
 * @param standings 已排序（强 → 弱）的队伍
 * @param history 交手记录
 */
export function foldPair(
  standings: { id: string }[],
  history: MatchHistory,
): { pairs: [string, string][]; adjusted: number; rematches: [string, string][] } {
  const size = standings.length
  const half = size / 2
  const top = standings.slice(0, half).map((team) => team.id)
  const bottom = standings
    .slice(half)
    .map((team) => team.id)
    .reverse()

  // 重赛判定只看「同分组内是否交手过」
  const met = (a: string, b: string) => (history[a] ?? []).includes(b)

  const pairs: [string, string][] = []
  const rematches: [string, string][] = []
  let adjusted = 0

  // 下半区可用池，按原顺序（倒数第一名优先配给名次最高的队伍）
  const pool = [...bottom]

  for (const team of top) {
    const index = pool.findIndex((candidate) => !met(team, candidate))

    // 全部打过：退回首尾配对，记为被迫重赛
    const pick = index === -1 ? 0 : index

    const opponent = pool.splice(pick, 1)[0]
    if (index > 0) adjusted++
    if (index === -1) rematches.push([team, opponent])
    pairs.push([team, opponent])
  }

  return { pairs, adjusted, rematches }
}

/**
 * 对一批战绩相同的队伍做配对。
 *
 * @param record 战绩组
 * @param teams 组内队伍（顺序不重要，这里会按 Buchholz 重排）
 * @param history 交手记录
 * @param records 全阶段战绩表（含已晋级/淘汰的对手，Buchholz 靠它计分）
 */
export function pairGroup(
  record: string,
  teams: PairingTeam[],
  history: MatchHistory,
  records: Map<string, TeamRecord>,
): PairingGroup {
  // 对手可能已经晋级/淘汰、不在本批参赛者里，所以战绩表要包含他们
  const fullRecords = new Map(records)
  for (const team of teams) fullRecords.set(team.id, parseRecord(team.record))

  const standings = teams
    .map((team) => ({
      id: team.id,
      buchholz: buchholzScore(team.id, history, fullRecords),
      seed: team.seed,
    }))
    .toSorted(compareStanding)

  const { pairs, adjusted, rematches } = foldPair(standings, history)

  return { record, standings, pairs, adjusted, rematches }
}

/**
 * 一轮完整配对：按战绩分组，各自内部配对。
 *
 * @param teams 仍在比赛中的队伍
 * @param history 交手记录
 * @param finishedRecords 已晋级/淘汰队伍的战绩（Buchholz 要用，可选）
 */
export function pairRound(
  teams: PairingTeam[],
  history: MatchHistory,
  finishedRecords: Map<string, TeamRecord> = new Map(),
): PairingResult {
  const records = new Map(finishedRecords)
  for (const team of teams) records.set(team.id, parseRecord(team.record))

  const byRecord = new Map<string, PairingTeam[]>()
  for (const team of teams) {
    const list = byRecord.get(team.record) ?? []
    list.push(team)
    byRecord.set(team.record, list)
  }

  // 展示顺序：胜场多的组在前
  const orderedKeys = [...byRecord.keys()].toSorted((a, b) => {
    const ra = parseRecord(a)
    const rb = parseRecord(b)
    return rb.wins - ra.wins || ra.losses - rb.losses
  })

  return {
    groups: orderedKeys.map((record) => pairGroup(record, byRecord.get(record)!, history, records)),
  }
}

/* -------------------------------------------------------------------------- */
/*                                 推演模拟                                    */
/* -------------------------------------------------------------------------- */

export type RandomFn = () => number

export interface SimulationOptions {
  /** 随机源，默认 Math.random。按胜者概率判定每场结果 */
  random?: RandomFn
  /** 每队胜率权重，缺省视为相同（50/50） */
  strength?: (id: string) => number
}

interface SimTeam {
  id: string
  seed: number
  record: TeamRecord
}

/**
 * 模拟一轮瑞士轮的全部 5 轮，返回最终分组。
 *
 * - 每轮先按规则配对，再按胜率掷出胜负
 * - 已三胜/三负的队伍不再参与后续轮次
 * - 若某组人数为奇数（理论上不会发生），落单的队伍轮空记一胜
 */
export function simulateSwissStage(
  stageId: SwissStageType,
  teamIds: string[],
  options: SimulationOptions = {},
): SwissSimulation {
  const random = options.random ?? Math.random
  const strength = options.strength ?? (() => 1)

  // 初始种子即传入顺序（events.json 里 stage.teams 的顺序就是种子序）
  const teams = new Map<string, SimTeam>(
    teamIds.map((id, index) => [id, { id, seed: index + 1, record: { wins: 0, losses: 0 } }]),
  )

  const history: MatchHistory = {}
  for (const id of teamIds) history[id] = []

  const groupByRound: { round: number; group: string }[] = []

  for (let round = 1; round <= 5; round++) {
    const active = [...teams.values()].filter((team) => !isRecordDecided(team.record))

    // 本轮不会再有比赛（理论上 16 队打 5 轮，每轮都有比赛）
    if (active.length < 2) break

    // 已晋级/淘汰的队伍也要参与 Buchholz 计算
    const finishedRecords = new Map<string, TeamRecord>()
    for (const team of teams.values()) {
      if (isRecordDecided(team.record)) finishedRecords.set(team.id, team.record)
    }

    const pairing = pairRound(
      active.map((team) => ({
        id: team.id,
        record: formatRecord(team.record),
        seed: team.seed,
      })),
      history,
      finishedRecords,
    )

    for (const group of pairing.groups) {
      for (const [a, b] of group.pairs) {
        groupByRound.push({ round, group: group.record })

        const teamA = teams.get(a)!
        const teamB = teams.get(b)!

        const weightA = strength(a)
        const weightB = strength(b)
        const probabilityA = weightA + weightB === 0 ? 0.5 : weightA / (weightA + weightB)
        const winner = random() < probabilityA ? teamA : teamB
        const loser = winner === teamA ? teamB : teamA

        winner.record.wins++
        loser.record.losses++
        history[a].push(b)
        history[b].push(a)
      }
    }
  }

  const groups = Object.fromEntries(
    SWISS_RESULT_RECORDS.map((record) => [record, [] as SimulationTeam[]]),
  ) as Record<SwissResultRecord, SimulationTeam[]>

  for (const team of teams.values()) {
    groups[toResultRecord(team.record)].push({ id: team.id, record: toResultRecord(team.record) })
  }

  return { stageId, groups, rounds: groupByRound }
}

/* -------------------------------------------------------------------------- */
/*                                 战绩推导                                    */
/* -------------------------------------------------------------------------- */

/** 进行中的战绩分组（1-0、2-2 等），由真实结果反推，用于展示配对表 */
export function isProgressRecord(record: string): record is SwissProgressRecord {
  return record.includes('-') && parseRecord(record).wins < 3 && parseRecord(record).losses < 3
}
