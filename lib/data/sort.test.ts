import { describe, expect, it } from 'vitest'

import {
  buildFrequencyRank,
  compareByCorrectFirst,
  compareByImpossibleFirst,
  compareByPlayoffs,
  compareLeaderboard,
  sortByRank,
  type SortableRow,
} from '@/lib/data/sort'

import type { PredictorStats } from '@/types'

function stats(overrides: Partial<PredictorStats> = {}): PredictorStats {
  return {
    id: 'p',
    name: 'P',
    platform: 'test',
    totalPassed: 0,
    totalStages: 0,
    totalCorrect: 0,
    totalPredictions: 0,
    stageResults: [],
    ...overrides,
  }
}

function row(overrides: {
  correct?: number
  impossible?: number
  passed?: boolean | null
  stats?: Partial<PredictorStats>
  aggregate?: Partial<SortableRow['aggregate']>
}): SortableRow {
  const { correct = 0, impossible = 0, passed = null } = overrides

  return {
    stats: stats(overrides.stats),
    stage: {
      stageId: 'stage-1',
      passed,
      totalCount: 10,
      requiredCount: 5,
      correctCount: correct,
      impossibleCount: impossible,
      isActualResultComplete: passed !== null,
    },
    aggregate: {
      passed: 0,
      failed: 0,
      correct: 0,
      impossible: 0,
      ...overrides.aggregate,
    },
  }
}

describe('compareByCorrectFirst', () => {
  it('猜对数多的在前', () => {
    const a = row({ correct: 8 })
    const b = row({ correct: 5 })
    expect(compareByCorrectFirst(a, b)).toBeLessThan(0)
  })

  it('猜对数相同则错误少的在前', () => {
    const a = row({ correct: 5, impossible: 1 })
    const b = row({ correct: 5, impossible: 3 })
    expect(compareByCorrectFirst(a, b)).toBeLessThan(0)
  })

  it('前两项相同则看总通过数与总正确数', () => {
    const a = row({ correct: 5, stats: { totalPassed: 3, totalCorrect: 10 } })
    const b = row({ correct: 5, stats: { totalPassed: 2, totalCorrect: 20 } })
    expect(compareByCorrectFirst(a, b)).toBeLessThan(0)

    const c = row({ correct: 5, stats: { totalPassed: 2, totalCorrect: 20 } })
    const d = row({ correct: 5, stats: { totalPassed: 2, totalCorrect: 10 } })
    expect(compareByCorrectFirst(c, d)).toBeLessThan(0)
  })

  it('没有阶段状态时按 0 处理', () => {
    const a: SortableRow = { stats: stats(), stage: null, aggregate: row({}).aggregate }
    const b = row({ correct: 1 })
    expect(compareByCorrectFirst(a, b)).toBeGreaterThan(0)
  })
})

describe('compareByImpossibleFirst', () => {
  it('已确定错误少的在前', () => {
    const a = row({ impossible: 0, correct: 3 })
    const b = row({ impossible: 2, correct: 9 })
    expect(compareByImpossibleFirst(a, b)).toBeLessThan(0)
  })

  it('错误数相同则猜对数多的在前', () => {
    const a = row({ impossible: 1, correct: 9 })
    const b = row({ impossible: 1, correct: 3 })
    expect(compareByImpossibleFirst(a, b)).toBeLessThan(0)
  })
})

describe('compareByPlayoffs', () => {
  it('通过轮次多的在前', () => {
    const a = row({ aggregate: { passed: 3 } })
    const b = row({ aggregate: { passed: 2 } })
    expect(compareByPlayoffs(a, b)).toBeLessThan(0)
  })

  it('通过数相同则失败少的在前', () => {
    const a = row({ aggregate: { passed: 2, failed: 0 } })
    const b = row({ aggregate: { passed: 2, failed: 1 } })
    expect(compareByPlayoffs(a, b)).toBeLessThan(0)
  })

  it('再看猜对数与错误数', () => {
    const a = row({ aggregate: { passed: 2, failed: 0, correct: 5 } })
    const b = row({ aggregate: { passed: 2, failed: 0, correct: 4 } })
    expect(compareByPlayoffs(a, b)).toBeLessThan(0)

    const c = row({ aggregate: { passed: 2, failed: 0, correct: 4, impossible: 1 } })
    const d = row({ aggregate: { passed: 2, failed: 0, correct: 4, impossible: 2 } })
    expect(compareByPlayoffs(c, d)).toBeLessThan(0)
  })
})

describe('compareLeaderboard', () => {
  it('先比通过任务数，再比猜对数', () => {
    expect(
      compareLeaderboard(stats({ totalPassed: 4 }), stats({ totalPassed: 3 })),
    ).toBeLessThan(0)
    expect(
      compareLeaderboard(
        stats({ totalPassed: 3, totalCorrect: 9 }),
        stats({ totalPassed: 3, totalCorrect: 8 }),
      ),
    ).toBeLessThan(0)
  })
})

describe('buildFrequencyRank', () => {
  it('统计每支队伍出现次数', () => {
    const rank = buildFrequencyRank([
      ['A', 'B'],
      ['A', 'C'],
      ['A', 'B'],
    ])

    expect(rank.get('A')).toBe(3)
    expect(rank.get('B')).toBe(2)
    expect(rank.get('C')).toBe(1)
  })

  it('空输入返回空表', () => {
    expect(buildFrequencyRank([]).size).toBe(0)
  })
})

describe('sortByRank', () => {
  it('按出现次数降序', () => {
    const rank = buildFrequencyRank([['A'], ['A', 'B'], ['A', 'B']])
    const sorted = sortByRank([{ id: 'C' }, { id: 'B' }, { id: 'A' }], rank)

    expect(sorted.map((team) => team.id)).toEqual(['A', 'B', 'C'])
  })

  it('未知队伍排最后', () => {
    const sorted = sortByRank([{ id: 'Z' }, { id: 'A' }], buildFrequencyRank([['A']]))
    expect(sorted.map((team) => team.id)).toEqual(['A', 'Z'])
  })

  it('不修改原数组', () => {
    const teams = [{ id: 'B' }, { id: 'A' }]
    sortByRank(teams, buildFrequencyRank([['A'], ['A'], ['B']]))
    expect(teams.map((team) => team.id)).toEqual(['B', 'A'])
  })
})
