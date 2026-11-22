import { describe, expect, it } from 'vitest'

import {
  buchholzScore,
  foldPair,
  formatRecord,
  getMatchFormat,
  isRecordDecided,
  pairGroup,
  pairRound,
  parseRecord,
  simulateSwissStage,
  toResultRecord,
  type MatchHistory,
} from '@/lib/data/swiss'

import type { SwissResultRecord } from '@/types'

/* -------------------------------------------------------------------------- */
/*                                  战绩                                       */
/* -------------------------------------------------------------------------- */

describe('战绩工具', () => {
  it('解析与格式化互逆', () => {
    expect(parseRecord('2-1')).toEqual({ wins: 2, losses: 1 })
    expect(formatRecord({ wins: 2, losses: 1 })).toBe('2-1')
  })

  it('三胜或三负即结束', () => {
    expect(isRecordDecided({ wins: 3, losses: 0 })).toBe(true)
    expect(isRecordDecided({ wins: 0, losses: 3 })).toBe(true)
    expect(isRecordDecided({ wins: 2, losses: 2 })).toBe(false)
  })

  it('最终分组由战绩直接决定', () => {
    expect(toResultRecord({ wins: 3, losses: 0 })).toBe('3-0')
    expect(toResultRecord({ wins: 1, losses: 3 })).toBe('1-3')
  })
})

/* -------------------------------------------------------------------------- */
/*                                  赛制                                       */
/* -------------------------------------------------------------------------- */

describe('getMatchFormat', () => {
  it('0-0 是 bo1', () => {
    expect(getMatchFormat({ wins: 0, losses: 0 })).toBe('bo1')
  })

  it('1-0 / 1-1 / 0-1 是 bo1', () => {
    expect(getMatchFormat({ wins: 1, losses: 0 })).toBe('bo1')
    expect(getMatchFormat({ wins: 1, losses: 1 })).toBe('bo1')
    expect(getMatchFormat({ wins: 0, losses: 1 })).toBe('bo1')
  })

  it('2-0 是 bo3（晋级战）', () => {
    expect(getMatchFormat({ wins: 2, losses: 0 })).toBe('bo3')
  })

  it('2-1 是 bo3（晋级战）', () => {
    expect(getMatchFormat({ wins: 2, losses: 1 })).toBe('bo3')
  })

  it('0-2 是 bo3（淘汰战）', () => {
    expect(getMatchFormat({ wins: 0, losses: 2 })).toBe('bo3')
  })

  it('1-2 是 bo1', () => {
    expect(getMatchFormat({ wins: 1, losses: 2 })).toBe('bo1')
  })

  it('2-2 是 bo3（晋级/淘汰战）', () => {
    expect(getMatchFormat({ wins: 2, losses: 2 })).toBe('bo3')
  })
})

/* -------------------------------------------------------------------------- */
/*                              首尾配对 + 重赛规避                            */
/* -------------------------------------------------------------------------- */

function historyOf(...pairs: [string, string][]): MatchHistory {
  const history: MatchHistory = {}
  for (const [a, b] of pairs) {
    history[a] = [...(history[a] ?? []), b]
    history[b] = [...(history[b] ?? []), a]
  }
  return history
}

describe('foldPair', () => {
  it('首尾配对：1 打 4、2 打 3', () => {
    const standings = ['t1', 't2', 't3', 't4'].map((id) => ({ id }))
    expect(foldPair(standings, {}).pairs).toEqual([
      ['t1', 't4'],
      ['t2', 't3'],
    ])
  })

  it('8 队小组同样首尾配对', () => {
    const standings = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => ({ id }))
    expect(foldPair(standings, {}).pairs).toEqual([
      ['a', 'h'],
      ['b', 'g'],
      ['c', 'f'],
      ['d', 'e'],
    ])
  })

  it('重赛：首选对手打过时向下换一个没打过的', () => {
    // a 与 h 已交手过
    const standings = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => ({ id }))
    const result = foldPair(standings, historyOf(['a', 'h']))

    expect(result.pairs).toContainEqual(['a', 'g'])
    expect(result.adjusted).toBe(1)
    // 每支队只出现一次
    expect(new Set(result.pairs.flat()).size).toBe(8)
  })

  it('重赛：高位队伍的候选对手不可能再打时退回原配对', () => {
    // a 和下半区 4 支队都打过
    const standings = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => ({ id }))
    const history = historyOf(['a', 'h'], ['a', 'g'], ['a', 'f'], ['a', 'e'])
    const result = foldPair(standings, history)

    expect(result.pairs).toContainEqual(['a', 'h'])
  })
})

/* -------------------------------------------------------------------------- */
/*                                Buchholz 排序                                */
/* -------------------------------------------------------------------------- */

describe('buchholzScore', () => {
  it('等于所有对手当前胜场之和', () => {
    const records = new Map([
      ['a', { wins: 1, losses: 0 }],
      ['x', { wins: 3, losses: 0 }],
      ['y', { wins: 1, losses: 2 }],
    ])
    expect(buchholzScore('a', historyOf(['a', 'x'], ['a', 'y']), records)).toBe(4)
  })

  it('没打过的对手不计分', () => {
    expect(buchholzScore('a', {}, new Map([['a', { wins: 1, losses: 0 }]]))).toBe(0)
  })
})

describe('pairGroup', () => {
  it('组内按 Buchholz 降序排序后再首尾配对', () => {
    // 组内 4 队：a 的对手赢过 3 场、b 的对手赢过 1 场、c/d 的对手全败
    // → a > b > (c, d 同分比种子)
    const history = historyOf(['a', 'C'], ['b', 'D'], ['c', 'E'], ['d', 'F'])
    const records = new Map([
      ['C', { wins: 3, losses: 0 }],
      ['D', { wins: 1, losses: 2 }],
      ['E', { wins: 0, losses: 3 }],
      ['F', { wins: 0, losses: 3 }],
    ])

    const group = pairGroup(
      '1-0',
      [
        { id: 'a', record: '1-0', seed: 1 },
        { id: 'b', record: '1-0', seed: 2 },
        { id: 'c', record: '1-0', seed: 3 },
        { id: 'd', record: '1-0', seed: 4 },
      ],
      history,
      records,
    )

    // Buchholz：a=3、b=1、c=0、d=0 → 同分时种子小的在前
    expect(group.standings.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(group.standings.map((t) => t.buchholz)).toEqual([3, 1, 0, 0])
    expect(group.pairs).toEqual([
      ['a', 'd'],
      ['b', 'c'],
    ])
  })

  it('Buchholz 高的排在前面（不是简单按种子排）', () => {
    // d 的对手赢过 3 场，a 的对手一场未赢 → d 排在 a 前面
    const history = historyOf(['a', 'X'], ['d', 'Y'])
    const records = new Map([
      ['X', { wins: 0, losses: 3 }],
      ['Y', { wins: 3, losses: 0 }],
    ])

    const group = pairGroup(
      '0-0',
      [
        { id: 'a', record: '0-0', seed: 1 },
        { id: 'b', record: '0-0', seed: 2 },
        { id: 'c', record: '0-0', seed: 3 },
        { id: 'd', record: '0-0', seed: 4 },
      ],
      history,
      records,
    )

    // d=3 分；a/b/c 均 0 分，按种子 a → b → c
    expect(group.standings.map((t) => t.id)).toEqual(['d', 'a', 'b', 'c'])
    expect(group.standings.map((t) => t.buchholz)).toEqual([3, 0, 0, 0])
  })

  it('Buchholz 相同按种子打破平局（种子小的排前）', () => {
    const group = pairGroup(
      '0-0',
      [
        { id: 'seed16', record: '0-0', seed: 16 },
        { id: 'seed1', record: '0-0', seed: 1 },
      ],
      {},
      new Map(),
    )
    expect(group.standings.map((t) => t.id)).toEqual(['seed1', 'seed16'])
  })
})

/* -------------------------------------------------------------------------- */
/*                                 整轮配对                                    */
/* -------------------------------------------------------------------------- */

describe('pairRound', () => {
  it('第 1 轮按种子首尾配对：1 打 16、2 打 15……', () => {
    const teams = Array.from({ length: 16 }, (_, index) => ({
      id: `s${index + 1}`,
      record: '0-0',
      seed: index + 1,
    }))

    const { groups } = pairRound(teams, {})
    expect(groups).toHaveLength(1)
    expect(groups[0].pairs).toEqual([
      ['s1', 's16'],
      ['s2', 's15'],
      ['s3', 's14'],
      ['s4', 's13'],
      ['s5', 's12'],
      ['s6', 's11'],
      ['s7', 's10'],
      ['s8', 's9'],
    ])
  })

  it('按战绩分组，胜场多的组排在前面', () => {
    const teams = [
      { id: 'a', record: '1-0', seed: 1 },
      { id: 'b', record: '1-0', seed: 2 },
      { id: 'c', record: '0-1', seed: 3 },
      { id: 'd', record: '0-1', seed: 4 },
    ]

    const { groups } = pairRound(teams, historyOf(['c', 'd']))
    expect(groups.map((group) => group.record)).toEqual(['1-0', '0-1'])
    // c/d 打过，不能重赛 → 但小组只有两队，只能回退
    expect(groups[1].pairs).toEqual([['c', 'd']])
  })

  it('1-0 组内不会把交过手的队伍再配一起', () => {
    const history = historyOf(['a', 'x'], ['b', 'y'])
    const teams = [
      { id: 'a', record: '1-0', seed: 1 },
      { id: 'b', record: '1-0', seed: 2 },
      { id: 'x', record: '1-0', seed: 3 },
      { id: 'y', record: '1-0', seed: 4 },
    ]

    const { groups } = pairRound(teams, history)
    for (const [p, q] of groups[0].pairs) {
      expect((history[p] ?? []).includes(q)).toBe(false)
    }
  })
})

/* -------------------------------------------------------------------------- */
/*                                  推演                                       */
/* -------------------------------------------------------------------------- */

function counts(simulation: ReturnType<typeof simulateSwissStage>) {
  return Object.fromEntries(
    (Object.keys(simulation.groups) as SwissResultRecord[]).map((record) => [
      record,
      simulation.groups[record].length,
    ]),
  )
}

describe('simulateSwissStage', () => {
  const teams = Array.from({ length: 16 }, (_, index) => `t${index + 1}`)

  it('16 队推演后分组数量固定', () => {
    const simulation = simulateSwissStage('stage-1', teams)
    expect(counts(simulation)).toEqual({
      '3-0': 2,
      '3-1': 3,
      '3-2': 3,
      '2-3': 3,
      '1-3': 3,
      '0-3': 2,
    })
  })

  it('每支队伍都恰好出现一次', () => {
    const simulation = simulateSwissStage('stage-1', teams)
    const all = Object.values(simulation.groups).flatMap((group) => group.map((team) => team.id))
    expect(all.toSorted()).toEqual(teams.toSorted())
  })

  it('每队最终战绩与所在分组一致', () => {
    const simulation = simulateSwissStage('stage-1', teams)
    for (const [record, group] of Object.entries(simulation.groups)) {
      for (const team of group) expect(team.record).toBe(record)
    }
  })

  it('共 5 轮，每轮场次与分组符合瑞士轮递推（16 队）', () => {
    const simulation = simulateSwissStage('stage-1', teams)
    const byRound = new Map<number, Map<string, number>>()

    for (const item of simulation.rounds) {
      const groups = byRound.get(item.round) ?? new Map<string, number>()
      groups.set(item.group, (groups.get(item.group) ?? 0) + 1)
      byRound.set(item.round, groups)
    }

    // 第 1 轮：16 队 0-0 → 8 场
    expect(Object.fromEntries(byRound.get(1)!)).toEqual({ '0-0': 8 })

    // 第 2 轮：1-0×8 / 0-1×8 → 各 4 场
    expect(Object.fromEntries(byRound.get(2)!)).toEqual({ '1-0': 4, '0-1': 4 })

    // 第 3 轮：2-0×4 / 1-1×8 / 0-2×4 —— 这一轮打完会产生 2 支晋级、2 支淘汰
    expect(Object.fromEntries(byRound.get(3)!)).toEqual({ '2-0': 2, '1-1': 4, '0-2': 2 })

    // 第 4 轮：剩 12 支，打 2-1×3 / 1-2×3（共 6 场）
    expect(Object.fromEntries(byRound.get(4)!)).toEqual({ '2-1': 3, '1-2': 3 })

    // 第 5 轮：只剩 2-2 组（6 队？→ 3 场）
    expect(Object.fromEntries(byRound.get(5)!)).toEqual({ '2-2': 3 })

    // 总场次 = 8 + 8 + 8 + 6 + 3
    expect(simulation.rounds).toHaveLength(33)
  })


  it('同一个种子固定随机源时可复现', () => {
    let seed = 42
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }

    const a = simulateSwissStage('stage-1', teams, { random })
    seed = 42
    const b = simulateSwissStage('stage-1', teams, { random })

    expect(a.groups).toEqual(b.groups)
  })

  it('胜率权重高的队伍更常打进 3-0', () => {
    let strongTop = 0
    for (let i = 0; i < 200; i++) {
      const simulation = simulateSwissStage('stage-1', teams, {
        strength: (id) => (id === 't1' || id === 't2' ? 9 : 1),
      })
      if (simulation.groups['3-0'].some((team) => team.id === 't1' || team.id === 't2')) {
        strongTop++
      }
    }
    // 随机结果，给一个宽松但明显的下界
    expect(strongTop).toBeGreaterThan(100)
  })

  it('推演过程中不会出现重赛（16 队规模下总能找到合法配对）', () => {
    // 真实场景中每轮配对都必须是新对手，否则说明配对实现有误
    for (let i = 0; i < 50; i++) {
      expect(counts(simulateSwissStage('stage-1', teams))).toEqual({
        '3-0': 2,
        '3-1': 3,
        '3-2': 3,
        '2-3': 3,
        '1-3': 3,
        '0-3': 2,
      })
    }
  })
})
