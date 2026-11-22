import { describe, expect, it } from 'vitest'

import {
  advanceBracket,
  clearBracketPicks,
  createBracket,
  getBracketProgress,
  pairStandings,
  pickWinner,
  previewBracket,
  seedBracket,
  settleBracket,
  summarizeBracket,
  toggleMatchLock,
} from '@/lib/data/swiss-bracket'

const TEAMS = Array.from({ length: 16 }, (_, index) => `t${index + 1}`)

const STAGE = [
  'NIP',
  'PV',
  'HEROIC',
  'FaZe',
  'Liquid',
  'EF',
  '100T',
  '9z',
  'M80',
  'DENDELE',
  'Imperial',
  'Wildcard',
  'BCG',
  'FlyQuest',
  'CW',
  'LVG',
]

/** 依次把每一轮全部选成 a 方获胜，返回最终状态 */
function pickAllA(state = createBracket(TEAMS), rounds = 5) {
  let next = state
  for (let round = 1; round <= rounds; round++) {
    const matches = next.matches.filter((match) => match.round === round)
    if (!matches.length) break
    for (const match of matches) next = pickWinner(next, match.id, match.a)
    next = advanceBracket(next)
  }
  return next
}

describe('createBracket', () => {
  it('首轮生成 8 场 0-0 组对局', () => {
    const state = createBracket(TEAMS)
    expect(state.matches).toHaveLength(8)
    expect(new Set(state.matches.map((match) => match.round))).toEqual(new Set([1]))
    expect(state.matches.every((match) => match.group === '0-0')).toBe(true)
    expect(state.matches.every((match) => match.format === 'bo1')).toBe(true)
  })

  it('第 1 轮两半同位对位：1 号种子对 9 号种子', () => {
    const state = createBracket(TEAMS)
    expect(state.matches[0]).toMatchObject({ a: 't1', b: 't9' })
    expect(state.matches[7]).toMatchObject({ a: 't8', b: 't16' })
  })

  it('第 2 轮起同战绩组内首尾配对', () => {
    // R1 全部让高位种子获胜 → 1-0 组为 t1..t8，首尾配对得 t1-t8
    let state = createBracket(TEAMS)
    for (const match of state.matches) state = pickWinner(state, match.id, match.a)

    const round2 = state.matches.filter((match) => match.round === 2)
    const oneZero = round2.filter((match) => match.group === '1-0')

    expect(oneZero).toHaveLength(4)
    expect(oneZero[0]).toMatchObject({ a: 't1', b: 't8' })
    expect(oneZero[3]).toMatchObject({ a: 't4', b: 't5' })
  })
})

describe('pickWinner', () => {
  it('选中胜者后战绩更新（整表始终完整）', () => {
    const state = settleBracket(createBracket(TEAMS))
    const match = state.matches[0]
    const next = pickWinner(state, match.id, match.b)

    expect(next.matches.find((item) => item.id === match.id)!.winner).toBe(match.b)
    expect(next.matches).toHaveLength(33)
    expect(next.teams[match.b].wins).toBeGreaterThan(0)
  })

  it('不修改原状态', () => {
    const state = createBracket(TEAMS)
    const match = state.matches[0]
    pickWinner(state, match.id, match.a)
    expect(state.teams[match.a].wins).toBe(0)
    expect(state.matches[0].winner).toBeNull()
  })

  it('可以修改任意一轮的结果，后面轮次自动重算', () => {
    const state = settleBracket(createBracket(TEAMS))
    const match = state.matches[0]
    const first = pickWinner(state, match.id, match.a)
    const second = pickWinner(first, match.id, match.b)

    expect(second.matches.find((item) => item.id === match.id)!.winner).toBe(match.b)
    // 改完之后依然是完整的 33 场
    expect(second.matches).toHaveLength(33)
    expect(second.matches.every((item) => item.winner)).toBe(true)
  })
})

describe('advanceBracket', () => {
  it('previewBracket 会补全 5 轮（用于横向面板预览）', () => {
    const preview = previewBracket(createBracket(TEAMS))
    for (const round of [1, 2, 3, 4, 5]) {
      expect(preview.matches.filter((match) => match.round === round).length).toBeGreaterThan(0)
    }
    const { groups } = summarizeBracket(preview)
    expect(groups['3-0']).toHaveLength(2)
    expect(groups['0-3']).toHaveLength(2)
  })

  it('选完一轮后生成下一轮，晋级战为 bo3', () => {
    let state = createBracket(TEAMS)
    for (const match of state.matches) state = pickWinner(state, match.id, match.a)
    state = advanceBracket(state)

    const round2 = state.matches.filter((match) => match.round === 2)
    expect(round2).toHaveLength(8)
    expect(round2.filter((match) => match.group === '0-1')).toHaveLength(4)
    // 1-0 组仍为 bo1
    expect(round2.every((match) => match.format === 'bo1')).toBe(true)
  })

  it('2-x 与 0-2 组是 bo3', () => {
    const state = pickAllA(createBracket(TEAMS), 2)
    const round3 = state.matches.filter((match) => match.round === 3)
    const bo3Groups = round3.filter((match) => match.format === 'bo3').map((match) => match.group)
    expect(new Set(bo3Groups)).toEqual(new Set(['2-0', '0-2']))
  })
})

describe('完整推演', () => {
  it('打完 5 轮得到 33 场，分组符合 2/3/3/3/3/2', () => {
    const state = pickAllA(createBracket(TEAMS), 5)
    const progress = getBracketProgress(state)

    expect(progress.done).toBe(true)
    expect(state.matches).toHaveLength(33)
    expect(progress.picked).toBe(33)

    const { groups } = summarizeBracket(state)
    expect(groups['3-0']).toHaveLength(2)
    expect(groups['3-1']).toHaveLength(3)
    expect(groups['3-2']).toHaveLength(3)
    expect(groups['2-3']).toHaveLength(3)
    expect(groups['1-3']).toHaveLength(3)
    expect(groups['0-3']).toHaveLength(2)
  })

  it('每支队伍最多 3 胜或 3 负', () => {
    const state = pickAllA(createBracket(TEAMS), 5)
    for (const team of Object.values(summarizeBracket(state).records)) {
      expect(team.wins <= 3 && team.losses <= 3).toBe(true)
      expect(team.wins === 3 || team.losses === 3).toBe(true)
    }
  })

  it('尽量不重赛：重赛只会在排不开时出现，且不影响 33 场的结构', () => {
    const state = pickAllA(createBracket(TEAMS), 5)
    expect(state.matches).toHaveLength(33)

    // 同一对队伍最多出现一次，除非该轮确实无法避免
    const counts = new Map<string, number>()
    for (const match of state.matches) {
      const key = [match.a, match.b].toSorted().join('|')
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    for (const count of counts.values()) expect(count).toBeLessThanOrEqual(2)
  })
})

describe('始终完整的推演', () => {
  it('初始就是 33 场、每场都有胜者', () => {
    const state = settleBracket(createBracket(TEAMS))
    expect(state.matches).toHaveLength(33)
    expect(state.matches.every((match) => match.winner !== null)).toBe(true)
  })

  it('默认按种子：排名高的一方获胜', () => {
    const state = settleBracket(createBracket(TEAMS))
    const round1 = state.matches.filter((match) => match.round === 1)
    for (const match of round1) expect(match.winner).toBe(match.a)
  })

  it('改第一轮任意一场，后面轮次仍然全部有胜者', () => {
    let state = settleBracket(createBracket(TEAMS))
    const first = state.matches[0]
    state = pickWinner(state, first.id, first.b)

    expect(state.matches.find((match) => match.id === first.id)!.winner).toBe(first.b)
    expect(state.matches).toHaveLength(33)
    expect(state.matches.every((match) => match.winner !== null)).toBe(true)
  })

  it('改任意一轮都会重算后续配对', () => {
    let state = settleBracket(createBracket(TEAMS))
    const first = state.matches[0]
    const before = state.matches
      .filter((match) => match.round === 2)
      .map((match) => `${match.a}-${match.b}`)
      .join(',')

    state = pickWinner(state, first.id, first.b)
    const after = state.matches
      .filter((match) => match.round === 2)
      .map((match) => `${match.a}-${match.b}`)
      .join(',')

    expect(after).not.toBe(before)
  })
})

describe('配对排序（与 swiss.ts 的 pairGroup 一致）', () => {
  it('同战绩组内按 Buchholz 降序、同分按种子升序排列后首尾配对', () => {
    // 1-1 组四队：M80 的对手赢过 2 场（Buchholz 最高），其余三队对手各 1 场
    const history: Record<string, string[]> = {
      M80: ['PV'],
      NIP: ['LVG'],
      EF: ['Imperial'],
      Wildcard: ['BCG'],
    }
    const standings = [
      { id: 'M80', buchholz: 2, seed: 9 },
      { id: 'NIP', buchholz: 1, seed: 1 },
      { id: 'EF', buchholz: 1, seed: 6 },
      { id: 'Wildcard', buchholz: 1, seed: 12 },
    ]

    expect(pairStandings(standings, (a, b) => (history[a] ?? []).includes(b))).toEqual([
      ['M80', 'Wildcard'],
      ['NIP', 'EF'],
    ])
  })

  it('重新配对后默认由种子更高的一方获胜，而不是 a 位', () => {
    // 1-1 组按 Buchholz 会排出 EF(s6)-NIP(s1)：a 位是 EF，但默认应 NIP 赢
    let state = settleBracket(createBracket(STAGE))
    const nip = state.matches.find((match) => match.a === 'NIP')!
    state = pickWinner(state, nip.id, 'M80')

    const ef = state.matches.find(
      (match) => match.round === 3 && [match.a, match.b].toSorted().join('-') === 'EF-NIP',
    )!

    expect(ef).toMatchObject({ a: 'EF', b: 'NIP', winner: 'NIP' })
  })

  it('只改第一轮一场胜负，第三轮按对手战绩重新排序（回归）', () => {
    // 新加坡 2026 第一阶段：默认 R1 NIP 胜 M80，改成 M80 胜后
    // 1-1 组应按 Buchholz 重排为 M80/Wildcard、NIP/EF、100T/Imperial、9z/DENDELE
    let state = settleBracket(createBracket(STAGE))
    const nip = state.matches.find((match) => [match.a, match.b].includes('NIP'))!
    state = pickWinner(state, nip.id, 'M80')

    const round3 = state.matches
      .filter((match) => match.round === 3 && match.group === '1-1')
      .map((match) => [match.a, match.b].toSorted().join('-'))

    expect(round3.toSorted()).toEqual(
      ['100T-Imperial', '9z-DENDELE', 'EF-NIP', 'M80-Wildcard'].toSorted(),
    )
  })

  it('Buchholz 用对手净胜场，2-2 组按真实排名配对（回归）', () => {
    // 同上：只把 R1 改成 M80 胜 NIP。2-2 组的真实组内排名是
    // FaZe #1、M80 #2、9z #3、Imperial #4、EF #5、DENDELE #6
    // 首尾配对 → FaZe/DENDELE、M80/EF、9z/Imperial。
    // 若 Buchholz 用「对手胜场和」，9z/Imperial/EF 都是 8 分并列，
    // 只能退化到按种子排（EF/9z/Imperial），配对就会错成 M80/Imperial、EF/9z。
    let state = settleBracket(createBracket(STAGE))
    const nip = state.matches.find((match) => [match.a, match.b].includes('NIP'))!
    state = pickWinner(state, nip.id, 'M80')

    const round5 = state.matches
      .filter((match) => match.round === 5 && match.group === '2-2')
      .map((match) => [match.a, match.b].toSorted().join('-'))

    expect(round5.toSorted()).toEqual(['DENDELE-FaZe', 'EF-M80', '9z-Imperial'].toSorted())
  })
})
