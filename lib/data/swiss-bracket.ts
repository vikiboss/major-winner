/**
 * 瑞士轮手动推演：用户逐场点选胜者，配对自动重算。
 *
 * 与 `swiss.ts` 的 `simulateSwissStage` 的区别：
 * - 胜负由用户逐场选择，不由随机源决定
 * - 每轮配对只依赖「已经确定的对局」，上一轮全部选完才生成下一轮
 * - 可以锁定某一场的胜者（`locked`），重算时保持不变
 * - 真实赛程里已结束的对局默认锁定
 *
 * 规则与 `swiss.ts` 保持一致：同战绩交手、Buchholz 排序、首尾配对、重赛规避、
 * 2-x 组与 0-2 组 BO3，其余 BO1。
 *
 * 配对用「回溯搜索」找一组无重赛的配对：首尾配对可行时结果与 `swiss.ts` 一致，
 * 遇到死路（例如 4 队同组 A-B、C-D 已交手）会自动换一种配法，而不是强行重赛。
 *
 * 这里只放纯函数，页面请通过 `lib/data` 的导出使用。
 */

import { SWISS_RESULT_RECORDS } from '@/lib/constants'

import { formatRecord, getMatchFormat, isRecordDecided, parseRecord, toResultRecord } from './swiss'

import type { Match, MatchFormat, SwissResultRecord } from '@/types'

/* -------------------------------------------------------------------------- */
/*                                  类型                                       */
/* -------------------------------------------------------------------------- */

/** 一支队伍在推演中的状态 */
export interface BracketTeam {
  id: string
  /** 初始种子（1 起，越小越强） */
  seed: number
  wins: number
  losses: number
  /** 当前战绩，如 2-1 */
  record: string
}

/** 一场待推演的对局 */
export interface BracketMatch {
  /** 稳定 id：`r{轮次}-m{序号}`（同轮内顺序固定，与配对无关） */
  id: string
  round: number
  /** 本场所属战绩组，如 2-1 */
  group: string
  format: MatchFormat
  a: string
  b: string
  /** 用户选择的胜者；null 表示未选 */
  winner: string | null
  /** 已锁定：重算时保持该场结果 */
  locked: boolean
  /** 真实赛程里的对局编号 */
  no?: number
}

/** 一次推演的全部状态 */
export interface BracketState {
  teams: Record<string, BracketTeam>
  matches: BracketMatch[]
}

/** 推演进度 */
export interface BracketProgress {
  /** 当前正在进行的轮次 */
  currentRound: number
  /** 当前轮的对局（用户要操作的那一轮） */
  active: BracketMatch[]
  /** 尚未选择的场次 */
  pending: BracketMatch[]
  /** 16 支队伍是否都已打满三胜或三负 */
  done: boolean
  /** 已选场次 */
  picked: number
  /** 全部场次（16 队 5 轮固定 33 场） */
  total: number
}

/** 推演摘要 */
export interface BracketSummary {
  /** 3-0 → 0-3 的分组（已出结果的队伍；推演中为临时分组） */
  groups: Record<SwissResultRecord, string[]>
  /** 每支队伍的当前战绩 */
  records: Record<string, BracketTeam>
  /** 每个对局的胜者 */
  winners: Record<string, string>
}

/* -------------------------------------------------------------------------- */
/*                                  配对                                       */
/* -------------------------------------------------------------------------- */

/**
 * 组内配对：优先「首尾配对」（强对弱），无解时回溯找任意无重赛组合。
 *
 * @param standings 已排序（Buchholz 降序、种子升序）的队伍
 * @param met 判断两队是否交过手
 */
export function pairStandings(
  standings: { id: string }[],
  met: (a: string, b: string) => boolean,
  mode: 'folded' | 'mirrored' = 'folded',
): [string, string][] {
  if (standings.length < 2) return []

  // 官方规则：
  // - 第 1 轮切两半后同位对位（1 对 n/2+1、2 对 n/2+2 …）
  // - 后续轮次同战绩组内首尾配对（1 对 n、2 对 n-1 …）
  const half = standings.length / 2
  const top = standings.slice(0, half)
  const bottom = mode === 'mirrored' ? standings.slice(half) : standings.slice(half).reverse()

  const folded = top.map((team, index) => [team.id, bottom[index].id] as [string, string])
  if (folded.every(([a, b]) => !met(a, b))) return folded

  // 回溯搜索：优先保留原本的首尾配对对象
  const pairs: [string, string][] = []
  const used = new Set<string>()

  const search = (index: number): boolean => {
    if (index === top.length) return true

    // 先试原本的对位对象，再试其余
    const preferred = bottom[index]
    const order = [preferred, ...bottom.filter((candidate) => candidate.id !== preferred.id)]

    for (const candidate of order) {
      if (used.has(candidate.id) || met(top[index].id, candidate.id)) continue

      used.add(candidate.id)
      pairs.push([top[index].id, candidate.id])
      if (search(index + 1)) return true

      pairs.pop()
      used.delete(candidate.id)
    }

    return false
  }

  return search(0) ? pairs : folded
}

/* -------------------------------------------------------------------------- */
/*                                  推演                                       */
/* -------------------------------------------------------------------------- */

/**
 * 初始化推演状态（第 1 轮配对已生成）。
 *
 * @param teamIds 参赛队伍，顺序即种子序（与 `data/events.json` 一致）
 */
export function createBracket(teamIds: string[]): BracketState {
  return advanceBracket({
    teams: Object.fromEntries(
      teamIds.map((id, index) => [id, { id, seed: index + 1, wins: 0, losses: 0, record: '0-0' }]),
    ),
    matches: [],
  })
}

/**
 * 按当前战绩生成下一轮配对。
 *
 * - 只对还没到三胜/三负的队伍配对
 * - 同战绩分组成对，组内按 Buchholz 降序 + 种子升序排序，再首尾配对（无重赛优先）
 *
 * @param state 当前状态
 * @param force 忽略「该轮已存在」检查（初始化用）
 */
export function advanceBracket(state: BracketState, force = false): BracketState {
  const round = Math.max(0, ...state.matches.map((match) => match.round)) + 1
  if (round > 5) return state
  if (!force && state.matches.some((match) => match.round === round)) return state

  const matches = buildRound(state, round)
  if (!matches.length) return state

  return { teams: state.teams, matches: [...state.matches, ...matches] }
}

/**
 * 按当前战绩推演第 `round` 轮的配对（不考虑后续轮次）。
 *
 * 预览后面几轮时用：把每场都当作「排在前面的队伍获胜」往下推一层，
 * 得到一个「如果都按种子强弱走」的默认剧本。
 */
export function buildRound(state: BracketState, round: number): BracketMatch[] {
  const ordered = Object.values(state.teams).toSorted((x, y) => x.seed - y.seed)
  const active = ordered.filter((team) => !isRecordDecided(team))
  if (active.length < 2) return []

  // 交手记录：只看已确定的对局
  const history: Record<string, string[]> = Object.fromEntries(
    ordered.map((team) => [team.id, [] as string[]]),
  )
  for (const match of state.matches) {
    if (!match.winner) continue
    history[match.a]?.push(match.b)
    history[match.b]?.push(match.a)
  }

  const records = new Map(
    ordered.map((team) => [team.id, { wins: team.wins, losses: team.losses }]),
  )

  const byRecord = new Map<string, BracketTeam[]>()
  for (const team of active) {
    const list = byRecord.get(team.record) ?? []
    list.push(team)
    byRecord.set(team.record, list)
  }

  const orderedKeys = [...byRecord.keys()].toSorted((a, b) => {
    const ra = parseRecord(a)
    const rb = parseRecord(b)
    return rb.wins - ra.wins || ra.losses - rb.losses
  })

  const met = (a: string, b: string) => (history[a] ?? []).includes(b)

  // 每个战绩组先各自配对。若组内存在「互相都打过」的死结，就把这组并到下一组
  // 一起配（真实赛事同样先按战绩、实在排不开再放宽）。
  // 先按战绩组各自配对；某一组内部全是「打过」的死结时，把仍然是自由身的队伍
  // 一起丢给全局配对（真实赛事同样先按战绩、排不开再放宽）。
  const added: Omit<BracketMatch, 'id'>[] = []

  const flush = (pairs: [string, string][], group: string) => {
    for (const [a, b] of pairs) {
      added.push({
        round,
        group,
        format: getMatchFormat(parseRecord(group)),
        a,
        b,
        winner: null,
        locked: false,
      })
    }
  }

  // 第 1 轮没有历史战绩，按官方赛制两半同位对位；之后按战绩组首尾配对
  const mode = round === 1 ? 'mirrored' : 'folded'

  let pending: BracketTeam[] = []

  for (const key of orderedKeys) {
    const standings = toStandings([...pending, ...byRecord.get(key)!], history, records)
    const paired = pairStandings(standings, met, mode)

    if (paired.length * 2 === standings.length) {
      flush(paired, key)
      pending = []
      continue
    }

    // 这一组排不开，先攒着，等后面的组一起再算
    pending = [...pending, ...byRecord.get(key)!]
  }

  if (pending.length >= 2) {
    const standings = toStandings(pending, history, records)
    const paired = pairStandings(standings, met, mode)
    const fallback = paired.length * 2 === standings.length ? paired : foldedPairs(standings)
    flush(fallback, pending[0].record)
  }

  // 槽位固定：胜者位置与配对结果解耦，换配对后选择不至于全部错位
  return added.map((match, index) => ({ ...match, id: `r${round}-m${index + 1}` }))
}

/** 把队伍转成配对用的站表（Buchholz 降序、种子升序） */
function toStandings(
  teams: BracketTeam[],
  history: Record<string, string[]>,
  records: Map<string, { wins: number; losses: number }>,
): { id: string; buchholz: number; seed: number }[] {
  // 与 `swiss.ts` 的 `pairGroup` 保持一致：Buchholz = 对手净胜场（胜 − 负）之和，
  // 组内按 Buchholz 降序、同分按种子升序，再由 `pairStandings` 首尾配对。
  // 用净胜场而不是纯胜场，否则对手「全胜」与「赢过又输过」同分，排序会跟真实赛事不一致。
  return teams
    .map((team) => ({
      id: team.id,
      buchholz: (history[team.id] ?? []).reduce((sum, opponent) => {
        const record = records.get(opponent)
        return sum + (record ? record.wins - record.losses : 0)
      }, 0),
      seed: team.seed,
    }))
    .toSorted((x, y) => y.buchholz - x.buchholz || x.seed - y.seed)
}

/** 无视交手记录的首尾配对（兜底用） */
function foldedPairs(standings: { id: string }[]): [string, string][] {
  const half = standings.length / 2
  const top = standings.slice(0, half)
  const bottom = standings.slice(half).reverse()

  return top.map((team, index) => [team.id, bottom[index].id] as [string, string])
}

/** 选择某场胜者 */
export function pickWinner(state: BracketState, matchId: string, winnerId: string): BracketState {
  return setWinner(state, matchId, winnerId)
}

/** 取消某场的胜者 */
export function clearWinner(state: BracketState, matchId: string): BracketState {
  return setWinner(state, matchId, null)
}

/** 锁定 / 解锁某场（锁定的场次在重算时保持结果） */
export function toggleMatchLock(state: BracketState, matchId: string): BracketState {
  const target = state.matches.find((match) => match.id === matchId)
  if (!target?.winner) return state

  return {
    teams: state.teams,
    matches: state.matches.map((match) =>
      match.id === matchId ? { ...match, locked: !match.locked } : match,
    ),
  }
}

/** 清空所有未锁定的选择（锁定结果保留） */
export function clearBracketPicks(state: BracketState): BracketState {
  const kept = state.matches
    .filter((match) => match.locked && match.winner)
    .map((match) => [match.id, match.winner!] as const)

  let next = createBracket(
    Object.values(state.teams)
      .toSorted((x, y) => x.seed - y.seed)
      .map((team) => team.id),
  )

  for (const [matchId, winner] of kept) next = setWinner(next, matchId, winner, true)
  return next
}

/**
 * 设置胜者并重算全部战绩与后续配对。
 *
 * 保留所有已选/已锁定的选择，从第一轮开始逐轮重放：
 * 改动前面的对局时，后续受影响的场次重新配对，队伍变了的旧选择作废。
 *
 * @param locked 是否把该场标记为锁定（预置真实赛程时用）
 */
function setWinner(
  state: BracketState,
  matchId: string,
  winnerId: string | null,
  locked = false,
): BracketState {
  const target = state.matches.find((match) => match.id === matchId)
  if (!target) return state
  if (target.locked && !locked) return state
  if (winnerId && winnerId !== target.a && winnerId !== target.b) return state

  const choices = new Map<string, string>()
  for (const match of state.matches) if (match.winner) choices.set(match.id, match.winner)
  if (winnerId) choices.set(matchId, winnerId)
  else choices.delete(matchId)

  const locks = new Set(state.matches.filter((match) => match.locked).map((match) => match.id))
  if (locked) locks.add(matchId)
  else locks.delete(matchId)

  const previous = new Map(state.matches.map((match) => [match.id, match] as const))

  let next: BracketState = {
    teams: Object.fromEntries(
      Object.values(state.teams)
        .toSorted((x, y) => x.seed - y.seed)
        .map((team) => [
          team.id,
          { id: team.id, seed: team.seed, wins: 0, losses: 0, record: '0-0' },
        ]),
    ),
    matches: [],
  }

  for (let round = 1; round <= 5; round++) {
    next = advanceBracket(next)
    const roundMatches = next.matches.filter((match) => match.round === round)
    if (!roundMatches.length) break

    for (const match of roundMatches) {
      const before = previous.get(match.id)
      const sameTeams = before?.a === match.a && before?.b === match.b

      // 配对没变的沿用旧选择；配对变了就用默认剧本补位（种子数字小的排名高者获胜），
      // 注意这里不能直接取 `match.a`：首尾配对时 a 位并不总是更强的一方
      // （如 1-1 组 Buchholz 排序后可能排成 EF-NIP），那样会让弱队默认赢。
      const winner =
        sameTeams && choices.has(match.id)
          ? choices.get(match.id)!
          : defaultWinner(next.teams, match)
      match.locked = Boolean(winner) && locks.has(match.id) && sameTeams
      if (before?.no !== undefined) match.no = before.no

      match.winner = winner
      applyResult(next.teams, match.a, match.b, winner)
    }
  }

  return next
}

/**
 * 默认剧本的胜者：种子数字更小（排名更高）的一方。
 *
 * 界面上的 a 位是配对排序里的高位（Buchholz 优先），不一定是更强的队伍，
 * 所以默认结果必须比较种子，不能直接取 `match.a`。
 */
function defaultWinner(teams: Record<string, BracketTeam>, match: BracketMatch): string {
  const seedA = teams[match.a]?.seed ?? Number.MAX_SAFE_INTEGER
  const seedB = teams[match.b]?.seed ?? Number.MAX_SAFE_INTEGER
  return seedA <= seedB ? match.a : match.b
}

function applyResult(teams: Record<string, BracketTeam>, a: string, b: string, winner: string) {
  const loser = winner === a ? b : a
  const winnerTeam = teams[winner]
  const loserTeam = teams[loser]
  if (!winnerTeam || !loserTeam) return

  winnerTeam.wins++
  loserTeam.losses++
  winnerTeam.record = formatRecord(winnerTeam)
  loserTeam.record = formatRecord(loserTeam)
}

/* -------------------------------------------------------------------------- */
/*                                  派生数据                                   */
/* -------------------------------------------------------------------------- */

/** 推演进度 */
export function getBracketProgress(state: BracketState): BracketProgress {
  const pending = state.matches.filter((match) => !match.winner)
  const done = Object.values(state.teams).every((team) => isRecordDecided(team))
  const currentRound = pending.length
    ? pending[0].round
    : Math.max(1, ...state.matches.map((match) => match.round))

  return {
    currentRound,
    active: state.matches.filter((match) => match.round === currentRound),
    pending,
    done,
    picked: state.matches.filter((match) => match.winner).length,
    total: 33,
  }
}

/**
 * 某一列上下需要「预占位」的已定稿分组。
 *
 * 从第 4 轮起，前面轮次已经分出胜负的队伍会顶到这一列的上下端：
 * - R4：上 3-0、下 0-3
 * - R5：上 3-0 / 3-1、下 1-3 / 0-3
 */
export const SETTLED_SLOTS: Record<
  number,
  { top: SwissResultRecord[]; bottom: SwissResultRecord[] }
> = {
  4: { top: ['3-0'], bottom: ['0-3'] },
  // 淘汰组也按「先出局在前」排：1-3 在 0-3 之上，全败垫底
  5: { top: ['3-0', '3-1'], bottom: ['1-3', '0-3'] },
}

/** 汇总分组（未打完的队伍只在战绩决定后归组） */
export function summarizeBracket(state: BracketState): BracketSummary {
  const groups = Object.fromEntries(
    SWISS_RESULT_RECORDS.map((record) => [record, [] as string[]]),
  ) as Record<SwissResultRecord, string[]>

  const records: Record<string, BracketTeam> = {}
  for (const team of Object.values(state.teams)) records[team.id] = team

  // 出线顺序：谁先打完第三分谁先出线，同一场里 a 位在上
  const decided = Object.values(records)
    .filter(isRecordDecided)
    .map((team) => ({ team, at: decidedAt(state, team.id) }))
    .toSorted((x, y) => x.at - y.at || x.team.seed - y.team.seed)

  for (const { team } of decided) {
    const bucket = groups[toResultRecord(team)]
    if (bucket) bucket.push(team.id)
  }

  const winners: Record<string, string> = {}
  for (const match of state.matches) if (match.winner) winners[match.id] = match.winner

  return { groups, records, winners }
}

/** 某队最后一场（决定出线/淘汰的那场）在赛程里的顺序号 */
function decidedAt(state: BracketState, teamId: string): number {
  for (let index = state.matches.length - 1; index >= 0; index--) {
    const match = state.matches[index]
    if (!match.winner) continue
    if (match.a === teamId || match.b === teamId) return index * 2 + (match.a === teamId ? 0 : 1)
  }
  return Number.MAX_SAFE_INTEGER
}

/**
 * 预测后续轮次：从当前状态出发，把每场都按「排在前面的队伍获胜」推进，
 * 直到 5 轮全部生成或没有可配对的队伍。
 *
 * 结果用来在横向面板里提前展示后几轮的对阵（随左边选择实时变化）。
 */
export function previewBracket(state: BracketState): BracketState {
  // 深拷贝：预览只用来展示，绝不能污染真实推演状态
  let next: BracketState = {
    teams: Object.fromEntries(Object.entries(state.teams).map(([id, team]) => [id, { ...team }])),
    matches: state.matches.map((match) => ({ ...match })),
  }

  for (let round = 1; round <= 5; round++) {
    if (!next.matches.some((match) => match.round === round)) next = advanceBracket(next)
    if (!next.matches.some((match) => match.round === round)) break

    for (const match of next.matches.filter((item) => item.round === round)) {
      if (match.winner) continue

      // 默认剧本：世界排名靠前（种子数字更小）的一方获胜
      const winner = defaultWinner(next.teams, match)
      match.winner = winner
      applyResult(next.teams, match.a, match.b, winner)
    }
  }

  return next
}

/**
 * 把默认剧本（每场都按排名高者获胜）落成真实推演状态，
 * 让用户可以修改任意一轮的对局。
 */
export function settleBracket(state: BracketState): BracketState {
  let next: BracketState = {
    teams: Object.fromEntries(Object.entries(state.teams).map(([id, team]) => [id, { ...team }])),
    matches: state.matches.map((match) => ({ ...match })),
  }

  for (let round = 1; round <= 5; round++) {
    if (!next.matches.some((match) => match.round === round)) next = advanceBracket(next)
    if (!next.matches.some((match) => match.round === round)) break

    for (const match of next.matches.filter((item) => item.round === round)) {
      if (match.winner) continue

      // 默认剧本：世界排名靠前（种子数字更小）的一方获胜
      const winner = defaultWinner(next.teams, match)
      match.winner = winner
      applyResult(next.teams, match.a, match.b, winner)
    }
  }

  return next
}

/** 把真实赛程里已结束的对局作为锁定结果预置进推演 */
export function seedBracket(state: BracketState, matches: Match[]): BracketState {
  const finished = matches
    .filter((match) => match.winner && match.teamA && match.teamB && match.round)
    .toSorted((x, y) => (x.round ?? 0) - (y.round ?? 0) || (x.no ?? 0) - (y.no ?? 0))

  let next = state

  for (const real of finished) {
    const match = next.matches.find((item) => {
      if (item.winner) return false
      const pair = [item.a, item.b]
      return pair.includes(real.teamA!) && pair.includes(real.teamB!)
    })
    if (!match) continue

    next = setWinner(next, match.id, real.winner!, true)
    const updated = next.matches.find((item) => item.id === match.id)
    if (updated && real.no !== undefined) updated.no = real.no
  }

  return next
}
